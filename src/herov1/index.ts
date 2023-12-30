import {
	timeline,
	type EasingGenerator,
	type TimelineDefinition,
	type Easing,
	type EasingFunction
} from 'motion';
import type { ComponentType, SvelteComponent } from 'svelte';

type UpdaterParams<T extends SvelteComponent> = {
	Component: ComponentType<T>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	props?: T extends SvelteComponent<infer Props extends Record<string, any>, any, any>
		? Props
		: // eslint-disable-next-line @typescript-eslint/no-explicit-any
		  Record<string, any>;
};

export type Updater = <T extends SvelteComponent>(params: UpdaterParams<T>) => void;

export function getHeroDescendents(root: Element, blacklist: string[]) {
	const keyAttribute = 'data-hero-key';
	const transitionAttribute = 'data-hero-transition';

	const descendents = root.querySelectorAll(`[${keyAttribute}]`) ?? [];

	return Array.from(descendents)
		.filter((e) => {
			const key = e.getAttribute(keyAttribute);
			return key !== null && !blacklist.includes(key);
		}) // TODO: sort and then use a sliding window for slightly more optimal
		.map((e) => {
			const transitions = e.getAttribute(transitionAttribute)?.split(' ') ?? [];
			const opacity = transitions.includes('opacity');
			const scale = transitions.includes('scale');
			return {
				key: e.getAttribute(keyAttribute) as string,
				element: e as HTMLElement,
				bounds: e.getBoundingClientRect(),
				transition: {
					out: {
						opacity: opacity ? [1, 0] : [1, 1],
						scale: scale ? [1, 0] : [1, 1]
					},
					in: {
						opacity: opacity ? [0, 1] : [1, 1],
						scale: scale ? [0, 1] : [1, 1]
					}
				}
			};
		});
}
type HeroDescendentInfo = typeof getHeroDescendents extends (...args: any[]) => Array<infer T>
	? T
	: never;

function setContainerStyles(container: HTMLElement, bounds: DOMRect) {
	// container.hidden = false;
	container.style.minWidth = `${bounds.width}px`;
	container.style.minHeight = `${bounds.height}px`;
}
function resetContainerStyles(container: HTMLElement) {
	// container.hidden = true;
	container.style.minWidth = '0px';
	container.style.minHeight = '0px';
}

function setContentStyles(
	outgoing: HTMLElement,
	outgoingBounds: DOMRect,
	current: HTMLElement,
	currentBounds: DOMRect
) {
	// makes content fixed so that swapping doesn't cost additional layouting
	outgoing.style.position = 'fixed';
	outgoing.style.left = '0';
	outgoing.style.top = '0';
	outgoing.style.minWidth = `${outgoingBounds.width}px`;
	outgoing.style.minHeight = `${outgoingBounds.height}px`;

	current.style.opacity = '0'; // invisible to avoid flicker between elements
	current.style.position = 'fixed';
	current.style.left = '0';
	current.style.top = '0';
	current.style.minWidth = `${currentBounds.width}px`;
	current.style.minHeight = `${currentBounds.height}px`;
}

function resetContentsStyles(outgoing: HTMLElement, current: HTMLElement) {
	outgoing.style.transform = 'none';
	outgoing.style.minWidth = '0';
	outgoing.style.minHeight = '0';

	current.style.position = 'static';
	current.style.opacity = '1';
	current.style.transform = 'none';
	current.style.minWidth = '0';
	current.style.minHeight = '0';
}

function rearrangeContents<T extends SvelteComponent>(
	outgoing: HTMLElement,
	current: HTMLElement,
	{ Component, props }: UpdaterParams<T>
) {
	// set both to fixed so that swapping doesn't flicker
	outgoing.style.position = 'fixed';
	current.style.position = 'fixed';

	// move current into outgoing, and add new element to current
	outgoing.replaceChildren(...current.children);
	current.innerHTML = ''; // empty
	// render component by adding it as a target
	new Component({
		target: current,
		props: props
	});
}

function calculateElementInfo(element: HTMLElement, blacklist: string[]) {
	element.style.position = 'static'; // briefly add to dom (to calculate layout)
	const bounds = element.getBoundingClientRect();
	const heroDescendents = getHeroDescendents(element, blacklist);
	element.style.position = 'fixed';

	return { bounds, heroDescendents };
}

function calculateHeroPairs(
	outgoingHeroDescendents: HeroDescendentInfo[],
	currentHeroDescendents: HeroDescendentInfo[]
) {
	const heroPairs: {
		outgoing: (typeof outgoingHeroDescendents)[number];
		current: (typeof currentHeroDescendents)[number];
	}[] = [];

	outgoingHeroDescendents.forEach((o) => {
		const c = currentHeroDescendents.find((c) => o.key === c.key);
		if (c !== undefined) {
			heroPairs.push({ outgoing: o, current: c });
		}
	});

	return heroPairs;
}

export function setFloatingElements(
	floating: HTMLElement,
	oHero: HeroDescendentInfo,
	cHero: HeroDescendentInfo
) {
	const oHeroFloating = oHero.element.cloneNode(true) as HTMLElement;
	const cHeroFloating = cHero.element.cloneNode(true) as HTMLElement;

	// set original element to hidden (floating will be visible)
	oHero.element.style.visibility = 'hidden';
	cHero.element.style.visibility = 'hidden';

	oHeroFloating.style.position = 'fixed';
	oHeroFloating.style.left = '0';
	oHeroFloating.style.top = '0';

	cHeroFloating.style.position = 'fixed';
	cHeroFloating.style.left = '0';
	cHeroFloating.style.top = '0';

	floating.append(oHeroFloating, cHeroFloating);
	return { oHeroFloating, cHeroFloating };
}

function tweenBounds(
	elementBounds: DOMRect,
	initialContainerBounds: DOMRect,
	finalContainerBounds: DOMRect
) {
	return {
		x: [
			initialContainerBounds.x + initialContainerBounds.width / 2 - elementBounds.width / 2,
			finalContainerBounds.x + finalContainerBounds.width / 2 - elementBounds.width / 2
		],
		y: [
			initialContainerBounds.y + initialContainerBounds.height / 2 - elementBounds.height / 2,
			finalContainerBounds.y + finalContainerBounds.height / 2 - elementBounds.height / 2
		]
	};
}

// Penner's Easing Functions: https://gizma.com/easing/
export type EasingType = EasingGenerator | Easing | EasingFunction;
export function createAnimationTimeline<T extends SvelteComponent>(
	container: HTMLElement,
	outgoing: HTMLElement,
	current: HTMLElement,
	floating: HTMLElement,
	blacklist: string[],
	duration: number,
	easing: EasingType,
	animateContainer: boolean,
	params: UpdaterParams<T>
) {
	const sequence: TimelineDefinition = [];

	rearrangeContents(outgoing, current, params);
	// NOTE: can move this to setContainerSize() and replace the parameter "outgoing" with "current"
	const outgoingInfo = calculateElementInfo(outgoing, blacklist);
	const currentInfo = calculateElementInfo(current, blacklist);

	let initialBounds = outgoingInfo.bounds;
	let finalBounds = currentInfo.bounds;

	setContentStyles(outgoing, initialBounds, current, finalBounds);

	if (animateContainer) {
		setContainerStyles(container, initialBounds);

		sequence.push([
			container,
			{
				minWidth: [`${initialBounds.width}px`, `${finalBounds.width}px`],
				minHeight: [`${initialBounds.height}px`, `${finalBounds.height}px`]
			},
			{ at: 0 }
		]);
	} else {
		container.style.minWidth = `${Math.max(initialBounds.width, finalBounds.width)}px`;
		container.style.minHeight = `${Math.max(initialBounds.height, finalBounds.height)}px`;
		// the boundary of both is updated to the new container bounds
		const containerBounds = container.getBoundingClientRect();
		initialBounds = containerBounds;
		finalBounds = containerBounds;
	}

	sequence.push(
		[
			outgoing,
			{
				opacity: [1, 0],
				scale: [1, 0],
				...tweenBounds(outgoingInfo.bounds, initialBounds, finalBounds)
			},
			{ at: 0 }
		],
		[
			current,
			{
				opacity: [0, 1],
				scale: [0, 1],
				...tweenBounds(currentInfo.bounds, initialBounds, finalBounds)
			},
			{ at: 0 }
		]
	);

	calculateHeroPairs(outgoingInfo.heroDescendents, currentInfo.heroDescendents).forEach(
		({ outgoing: oHero, current: cHero }) => {
			const { oHeroFloating, cHeroFloating } = setFloatingElements(floating, oHero, cHero);
			sequence.push(
				[
					oHeroFloating,
					{
						...oHero.transition.out,
						...tweenBounds(oHero.bounds, oHero.bounds, cHero.bounds)
					},
					{ at: 0 }
				],
				[
					cHeroFloating,
					{
						...cHero.transition.in,
						...tweenBounds(cHero.bounds, oHero.bounds, cHero.bounds)
					},
					{ at: 0 }
				]
			);
		}
	);

	const t = timeline(sequence, {
		duration: duration,
		defaultOptions: {
			easing
		}
	});

	t.finished.then(() => {
		resetContainerStyles(container);
		resetContentsStyles(outgoing, current);
		floating.replaceChildren();
		outgoing.replaceChildren();
		currentInfo.heroDescendents.forEach((e) => {
			e.element.style.visibility = 'visible';
		});
	});

	return t;
}
