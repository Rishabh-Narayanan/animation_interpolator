import {
	timeline,
	type TimelineDefinition,
} from 'motion';
import type { AnimationOptions } from './hero_context';

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
const px = (n: number) => `${n}px`;

function setup(
	container: HTMLElement,
	outgoingElement: HTMLElement,
	incomingElement: HTMLElement,
	heroKeyBlacklist: string[]
) {
	// avoid flicker of elements
	container.appendChild(outgoingElement);
	outgoingElement.style.position = 'fixed';
	outgoingElement.style.inset = '0 auto auto 0';

	incomingElement.style.position = 'fixed';
	incomingElement.style.inset = '0 auto auto 0';

	const outgoing = calculateElementInfo(outgoingElement, heroKeyBlacklist);
	const incoming = calculateElementInfo(incomingElement, heroKeyBlacklist);

	outgoing.element.style.minWidth = px(outgoing.element.clientWidth);
	outgoing.element.style.minHeight = px(outgoing.element.clientHeight);

	incoming.element.style.minWidth = px(incoming.element.clientWidth);
	incoming.element.style.minHeight = px(incoming.element.clientHeight);

	return { outgoing, incoming };
}

function setupContainerElement(
	container: HTMLElement,
	options: AnimationOptions,
	outgoing: DOMRect,
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
				minWidth: [px(outgoing.width), px(incoming.width)],
				minHeight: [px(outgoing.height), px(incoming.height)]
			},
			{ at: 0 }
		]);
		return { initialBounds: outgoing, finalBounds: incoming };
	} else if (options.containerSize === 'current') {
		container.style.minWidth = px(outgoing.width);
		container.style.minHeight = px(outgoing.height);
	} else if (options.containerSize === 'incoming') {
		container.style.minWidth = px(incoming.width);
		container.style.minHeight = px(incoming.height);
	} else if (options.containerSize === 'largest') {
		container.style.minWidth = px(Math.max(incoming.width, outgoing.width));
		container.style.minHeight = px(Math.max(incoming.height, outgoing.height));
	}
	// if bounds don't animate
	const bounds = container.getBoundingClientRect();
	return { initialBounds: bounds, finalBounds: bounds };
}

function setupRootElement(
	outgoing: { element: HTMLElement; bounds: DOMRect },
	incoming: { element: HTMLElement; bounds: DOMRect },
	options: AnimationOptions,
	initialBounds: DOMRect,
	finalBounds: DOMRect,
	sequence: TimelineDefinition
) {
	if (options.containerSize === 'animate' || options.containerSize === 'largest') {
		sequence.push(
			[
				outgoing.element,
				{
					...DEFAULT_TRANSITION.out,
					...tweenBounds(outgoing.bounds, initialBounds, finalBounds)
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
		outgoing.element.style.visibility = 'visible';
		incoming.element.style.visibility = 'hidden';

		outgoing.element.style.transform = `translate(${outgoing.bounds.x}px, ${outgoing.bounds.y}px)`;
		incoming.element.style.transform = 'none';
	} else if (options.containerSize === 'incoming') {
		incoming.element.style.visibility = 'visible';
		outgoing.element.style.visibility = 'hidden';

		incoming.element.style.transform = `translate(${incoming.bounds.x}px, ${incoming.bounds.y}px)`;
		outgoing.element.style.transform = 'none';
	}
}

function setupHeroElements(
	outgoingHero: Map<string, ElementAnimationInfo>,
	incomingHero: Map<string, ElementAnimationInfo>,
	container: Element,
	sequence: TimelineDefinition
) {
	const pairs: { i: ElementAnimationInfo; c: ElementAnimationInfo }[] = [];

	incomingHero.forEach((i, iKey) => {
		outgoingHero.forEach((c, cKey) => {
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
	outgoing: HTMLElement,
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

	outgoing.style.opacity = '1';
	outgoing.style.position = 'static';
	outgoing.style.visibility = 'visible';
	outgoing.style.minWidth = '0';
	outgoing.style.minHeight = '0';
	outgoing.style.transform = 'none';

	incoming.style.opacity = '1';
	incoming.style.position = 'static';
	incoming.style.visibility = 'visible';
	incoming.style.minWidth = '0';
	incoming.style.minHeight = '0';
	incoming.style.transform = 'none';
}

export function animate(
	// container will parent all floating elements and also animate size
	container: HTMLElement,
	outgoingElement: HTMLElement,
	incomingElement: HTMLElement,
	heroKeyBlacklist: string[],
	options: AnimationOptions,
	onFinished: (incoming: HTMLElement) => void,
) {
	const sequence: TimelineDefinition = [];

	const { outgoing, incoming } = setup(
		container,
		outgoingElement,
		incomingElement,
		heroKeyBlacklist
	);

	const { initialBounds, finalBounds } = setupContainerElement(
		container,
		options,
		outgoing.bounds,
		incoming.bounds,
		sequence
	);

	setupRootElement(outgoing, incoming, options, initialBounds, finalBounds, sequence);

	const pairs = setupHeroElements(
		outgoing.heroChildren,
		incoming.heroChildren,
		container,
		sequence
	);

	const t = timeline(sequence, {
		duration: options.durationSeconds,
		defaultOptions: {
			easing: options.easingFunction
		}
	});

	t.finished.then(() => {
		reset(container, outgoing.element, incoming.element, pairs);
		onFinished(incoming.element);
	});

	return t;
}