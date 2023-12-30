import anime from 'animejs';
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
	const fadeAttribute = 'data-hero-fade';

	const descendents = root.querySelectorAll(`[${keyAttribute}]`) ?? [];

	return Array.from(descendents)
		.filter((e) => {
			const key = e.getAttribute(keyAttribute);
			return key !== null && !blacklist.includes(key);
		}) // TODO: sort and then use a sliding window for slightly more optimal
		.map((e) => ({
			key: e.getAttribute(keyAttribute) as string,
			element: e as HTMLElement,
			shouldFade: e.getAttribute(fadeAttribute) === 'true', // undefined === false
			bounds: e.getBoundingClientRect()
		}));
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
	// makes content absolute so that swapping doesn't cost additional layouting
	outgoing.style.position = 'absolute';
	outgoing.style.left = '50%'; // centered
	outgoing.style.top = '50%';
	outgoing.style.transform = 'translate(-50%, -50%)';
	outgoing.style.minWidth = `${outgoingBounds.width}px`;
	outgoing.style.minHeight = `${outgoingBounds.height}px`;

	current.style.opacity = '0'; // invisible to avoid flicker between elements
	current.style.position = 'absolute';
	current.style.left = '50%'; // centered
	current.style.top = '50%';
	current.style.transform = 'translate(-50%, -50%)';
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
	// set both to absolute so that swapping doesn't flicker
	outgoing.style.position = 'absolute';
	current.style.position = 'absolute';

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
	element.style.position = 'absolute';

	return { bounds, heroDescendents };
}

type ElementInfo = typeof calculateElementInfo extends (...args: any[]) => infer T ? T : void;

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

	oHero.element.style.visibility = 'hidden';
	oHeroFloating.style.position = 'absolute';
	oHeroFloating.style.transform = 'translate(-50%, -50%)';

	cHero.element.style.visibility = 'hidden';
	cHeroFloating.style.position = 'absolute';
	cHeroFloating.style.transform = 'translate(-50%, -50%)';

	floating.append(oHeroFloating, cHeroFloating);
	return { oHeroFloating, cHeroFloating };
}

export function createAnimationTimeline<T extends SvelteComponent>(
	container: HTMLElement,
	outgoing: HTMLElement,
	current: HTMLElement,
	floating: HTMLElement,
	blacklist: string[],
	duration: number,
	easing: anime.EasingOptions,
	animateContainer: boolean,
	params: UpdaterParams<T>
) {
	const timeline = anime.timeline({
		duration,
		easing,
		autoplay: false,
		complete: () => {
			resetContainerStyles(container);
			resetContentsStyles(outgoing, current);
			floating.replaceChildren();
			outgoing.replaceChildren();
		}
	});

	rearrangeContents(outgoing, current, params);
	// NOTE: can move this to setContainerSize() and replace the parameter "outgoing" with "current"
	const outgoingInfo = calculateElementInfo(outgoing, blacklist);
	const currentInfo = calculateElementInfo(current, blacklist);

	let outgoingBounds = outgoingInfo.bounds;
	let currentBounds = currentInfo.bounds;

	setContentStyles(outgoing, outgoingBounds, current, currentBounds);

	if (animateContainer) {
		setContainerStyles(container, outgoingBounds);

		timeline.add(
			{
				targets: container,
				minWidth: [outgoingBounds.width, currentBounds.width],
				minHeight: [outgoingBounds.height, currentBounds.height]
			},
			0
		);
	} else {
		container.style.minWidth = `${Math.max(outgoingBounds.width, currentBounds.width)}px`;
		container.style.minHeight = `${Math.max(outgoingBounds.height, currentBounds.height)}px`;
		// the boundary of both is updated to the new container bounds
		const containerBounds = container.getBoundingClientRect();
		outgoingBounds = containerBounds;
		currentBounds = containerBounds;
	}

	timeline.add(
		{
			targets: outgoing,
			opacity: [1, 0],
			scale: [1, 0]
		},
		0
	);
	timeline.add(
		{
			targets: current,
			opacity: [0, 1],
			scale: [0, 1]
		},
		0
	);

	calculateHeroPairs(outgoingInfo.heroDescendents, currentInfo.heroDescendents).forEach(
		({ outgoing: oHero, current: cHero }) => {
			const { oHeroFloating, cHeroFloating } = setFloatingElements(floating, oHero, cHero);
			const left = [
				oHero.bounds.left - outgoingBounds.left + oHero.bounds.width / 2,
				cHero.bounds.left - currentBounds.left + cHero.bounds.width / 2
			];
			const top = [
				oHero.bounds.top - outgoingBounds.top + oHero.bounds.height / 2,
				cHero.bounds.top - currentBounds.top + cHero.bounds.height / 2
			];
			timeline
				.add(
					{
						targets: oHeroFloating,
						left,
						top,
						opacity: oHero.shouldFade ? [1, 0] : undefined
					},
					0
				)
				.add(
					{
						targets: cHeroFloating,
						left,
						top,
						opacity: cHero.shouldFade ? [0, 1] : undefined,
						complete: () => {
							cHero.element.style.visibility = 'visible'; // reset
						}
					},
					0
				);
		}
	);

	return timeline;
}

// use motion one

/*
		const outgoingBounds = current.getBoundingClientRect();
		const outgoingHero = getHeroDescendents(current, blacklist);

		// make elements absolute to avoid layout issues during swap
		container.hidden = false;
		container.style.minWidth = `${outgoingBounds.width}px`;
		container.style.minHeight = `${outgoingBounds.height}px`;

		outgoing.hidden = false;
		outgoing.style.position = 'absolute';
		outgoing.style.top = '0';
		outgoing.style.left = '0';
		outgoing.style.minWidth = `${outgoingBounds.width}px`;
		outgoing.style.minHeight = `${outgoingBounds.height}px`;

		current.style.opacity = '0'; // invisible to help avoid visible flicker
		current.style.position = 'absolute';
		current.style.top = '0';
		current.style.left = '0';

		// move current into outgoing, and add new element to current
		outgoing.replaceChildren(...current.children);
		current.innerHTML = ''; // empty
		// render component by adding it as a target
		const component = new Component({
			target: current,
			props: props
		});

		current.style.position = 'static'; // briefly render to find width (immediately remove from dom layout)
		const currentBounds = current.getBoundingClientRect();
		const currentHero = getHeroDescendents(current, blacklist);
		current.style.position = 'absolute';
		current.style.minWidth = `${currentBounds.width}px`;
		current.style.minHeight = `${currentBounds.height}px`;

		outgoing.style.transform = 'translate(-50%, -50%)'; // easier to work with center
		current.style.transform = 'translate(-50%, -50%)';
		
		const heroPairs: {
			outgoing: (typeof outgoingHero)[number];
			current: (typeof currentHero)[number];
		}[] = [];
		outgoingHero.forEach((o) => {
			const c = currentHero.find((c) => o.key === c.key);
			if (c !== undefined) {
				heroPairs.push({ outgoing: o, current: c });
			}
		});
*/
