import {
	timeline,
	type EasingGenerator,
	type TimelineDefinition,
	type Easing,
	type EasingFunction
} from 'motion';
import type { ComponentType, SvelteComponent } from 'svelte';

type HTMLElementBuilder<T extends SvelteComponent> = {
	Component: ComponentType<T>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	props?: T extends SvelteComponent<infer Props extends Record<string, any>, any, any>
		? Props
		: // eslint-disable-next-line @typescript-eslint/no-explicit-any
		  Record<string, any>;
};

export type Updater = <T extends SvelteComponent>(elementBuilder: HTMLElementBuilder<T>) => void;

const DEFAULT_TRANSITION = {
	out: {
		opacity: [1, 0],
		scale: [1, 0]
	},
	in: {
		opacity: [0, 1],
		scale: [0, 1]
	}
};

type ElementAnimationInfo = {
	element: HTMLElement;
	bounds: DOMRect;
	transition: typeof DEFAULT_TRANSITION;
};

function calculateElementInfo(element: HTMLElement, heroKeyBlacklist: string[]) {
	const HERO_SELECTOR = 'data-hero-key';
	const HERO_TRANSITIONS = 'data-hero-transition';

	element.style.position = 'static'; // add to dom tree to calculate layout
	const bounds = element.getBoundingClientRect();
	// calculate all descendent information
	const heroChildren = new Map<string, ElementAnimationInfo>();

	Array.from(element.querySelectorAll(`[${HERO_SELECTOR}]`) ?? [])
		.filter((e) => {
			const key = e.getAttribute(HERO_SELECTOR);
			return key !== null && !heroKeyBlacklist.includes(key);
		})
		.forEach((e) => {
			const transitions = e.getAttribute(HERO_TRANSITIONS)?.split(' ') ?? [];
			const opacity = transitions.includes('opacity');
			const scale = transitions.includes('scale');
			const key = e.getAttribute(HERO_SELECTOR) as string;

			if (heroChildren.has(key)) throw Error(`Duplicate hero key ${key} found`);
			heroChildren.set(key, {
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
			});
		});

	element.style.position = 'fixed'; // remove from dom layouting again

	return { element, bounds, heroChildren };
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

export type AnimationParams = {
	containerSize: 'animate' | 'current' | 'incoming' | 'largest';
	durationSeconds: number;
	easingFunction: EasingGenerator | Easing | EasingFunction;
};

const px = (n: number) => `${n}px`;

function setup<T extends SvelteComponent>(
	currentElement: HTMLElement,
	incomingElement: HTMLElement,
	incomingBuilder: HTMLElementBuilder<T>,
	heroKeyBlacklist: string[]
) {
	new incomingBuilder.Component({
		target: incomingElement,
		props: incomingBuilder.props
	});

	// avoid flicker of elements
	currentElement.style.position = 'fixed';
	currentElement.style.inset = '0 auto auto 0';

	incomingElement.style.position = 'fixed';
	incomingElement.style.inset = '0 auto auto 0';

	const current = calculateElementInfo(currentElement, heroKeyBlacklist);
	const incoming = calculateElementInfo(incomingElement, heroKeyBlacklist);

	current.element.style.minWidth = px(current.element.clientWidth);
	current.element.style.minHeight = px(current.element.clientHeight);

	incoming.element.style.minWidth = px(incoming.element.clientWidth);
	incoming.element.style.minHeight = px(incoming.element.clientHeight);

	return { current, incoming, originalIncomingElement: incomingElement };
}

function setupContainerElement(
	container: HTMLElement,
	options: AnimationParams,
	current: DOMRect,
	incoming: DOMRect,
	sequence: TimelineDefinition
): {
	initialBounds: DOMRect;
	finalBounds: DOMRect;
} {
	if (options.containerSize === 'animate') {
		sequence.push([
			container,
			{
				minWidth: [px(current.width), px(incoming.width)],
				minHeight: [px(current.height), px(incoming.height)]
			},
			{ at: 0 }
		]);
		return { initialBounds: current, finalBounds: incoming };
	} else if (options.containerSize === 'current') {
		container.style.minWidth = px(current.width);
		container.style.minHeight = px(current.height);
	} else if (options.containerSize === 'incoming') {
		container.style.minWidth = px(incoming.width);
		container.style.minHeight = px(incoming.height);
	} else if (options.containerSize === 'largest') {
		container.style.minWidth = px(Math.max(incoming.width, current.width));
		container.style.minHeight = px(Math.max(incoming.height, current.height));
	}
	// if bounds don't animate
	const bounds = container.getBoundingClientRect();
	return { initialBounds: bounds, finalBounds: bounds };
}

function setupRootElement(
	current: { element: HTMLElement; bounds: DOMRect },
	incoming: { element: HTMLElement; bounds: DOMRect },
	options: AnimationParams,
	initialBounds: DOMRect,
	finalBounds: DOMRect,
	sequence: TimelineDefinition
) {
	if (options.containerSize === 'animate' || options.containerSize === 'largest') {
		sequence.push(
			[
				current.element,
				{
					...DEFAULT_TRANSITION.out,
					...tweenBounds(current.bounds, initialBounds, finalBounds)
				},
				{ at: 0 }
			],
			[
				incoming.element,
				{
					...DEFAULT_TRANSITION.in,
					...tweenBounds(incoming.bounds, initialBounds, finalBounds)
				},
				{ at: 0 }
			]
		);
	} else if (options.containerSize === 'current') {
		current.element.style.visibility = 'visible';
		incoming.element.style.visibility = 'hidden';

		current.element.style.transform = `translate(${current.bounds.x}px, ${current.bounds.y}px)`;
		incoming.element.style.transform = 'none';
	} else if (options.containerSize === 'incoming') {
		incoming.element.style.visibility = 'visible';
		current.element.style.visibility = 'hidden';

		incoming.element.style.transform = `translate(${incoming.bounds.x}px, ${incoming.bounds.y}px)`;
		current.element.style.transform = 'none';
	}
}

function setupHeroElements(
	currentHero: Map<string, ElementAnimationInfo>,
	incomingHero: Map<string, ElementAnimationInfo>,
	container: Element,
	sequence: TimelineDefinition
) {
	const pairs: { i: ElementAnimationInfo; c: ElementAnimationInfo }[] = [];

	incomingHero.forEach((i, iKey) => {
		currentHero.forEach((c, cKey) => {
			if (iKey === cKey) pairs.push({ i, c });
		});
	});

	pairs.forEach(({ i, c }) => {
		const iClone = i.element.cloneNode(true) as HTMLElement;
		iClone.style.position = 'fixed';
		iClone.style.inset = '0 auto auto 0';
		iClone.style.minWidth = px(i.bounds.width);
		iClone.style.minHeight = px(i.bounds.height);
		i.element.style.visibility = 'hidden';

		const cClone = c.element.cloneNode(true) as HTMLElement;
		cClone.style.position = 'fixed';
		cClone.style.inset = '0 auto auto 0';
		cClone.style.minWidth = px(c.bounds.width);
		cClone.style.minHeight = px(c.bounds.height);
		c.element.style.visibility = 'hidden';

		container.append(cClone, iClone);

		sequence.push(
			[
				cClone,
				{
					...c.transition.out,
					...tweenBounds(c.bounds, c.bounds, i.bounds)
				},
				{ at: 0 }
			],
			[
				iClone,
				{
					...i.transition.in,
					...tweenBounds(i.bounds, c.bounds, i.bounds)
				},
				{ at: 0 }
			]
		);
	});

	return pairs;
}

function reset(
	container: HTMLElement,
	current: HTMLElement,
	incoming: HTMLElement,
	heroPairs: { i: { element: HTMLElement }; c: { element: HTMLElement } }[]
) {
	// RESET
	// MODIFIED: minWidth, minHeight, opacity, transform, position, inset

	container.replaceChildren(); // remove all children
	container.style.minWidth = '0';
	container.style.minHeight = '0';

	heroPairs.forEach(({ i, c }) => {
		i.element.style.visibility = 'visible';
		i.element.style.minWidth = '0';
		i.element.style.minHeight = '0';

		c.element.style.visibility = 'visible';
		c.element.style.minWidth = '0';
		c.element.style.minHeight = '0';
	});

	current.replaceChildren(...incoming.children);
	current.style.opacity = '1';
	current.style.position = 'static';
	current.style.visibility = 'visible';
	current.style.minWidth = '0';
	current.style.minHeight = '0';
	current.style.transform = 'none';

	incoming.replaceChildren();
	incoming.style.opacity = '1';
	incoming.style.position = 'static';
	incoming.style.visibility = 'visible';
	incoming.style.minWidth = '0';
	incoming.style.minHeight = '0';
	incoming.style.transform = 'none';
}

export function animate<T extends SvelteComponent>(
	// container will parent all floating elements and also animate size
	container: HTMLElement,
	currentElement: HTMLElement,
	incomingElement: HTMLElement,
	incomingBuilder: HTMLElementBuilder<T>,
	heroKeyBlacklist: string[],
	options: AnimationParams
) {
	const sequence: TimelineDefinition = [];

	const { current, incoming } = setup(
		currentElement,
		incomingElement,
		incomingBuilder,
		heroKeyBlacklist
	);

	const { initialBounds, finalBounds } = setupContainerElement(
		container,
		options,
		current.bounds,
		incoming.bounds,
		sequence
	);

	setupRootElement(current, incoming, options, initialBounds, finalBounds, sequence);

	const pairs = setupHeroElements(current.heroChildren, incoming.heroChildren, container, sequence);

	const t = timeline(sequence, {
		duration: options.durationSeconds,
		defaultOptions: {
			easing: options.easingFunction
		}
	});

	t.finished.then(() => {
		reset(container, current.element, incoming.element, pairs);
	});
	return t;
}
