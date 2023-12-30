import type { Easing, EasingFunction, EasingGenerator } from 'motion';
import { getContext, setContext, tick } from 'svelte';

export type AnimationOptions = {
	animate?: boolean;
	containerSize?: 'animate' | 'current' | 'incoming' | 'largest';
	durationSeconds?: number;
	easingFunction?: EasingGenerator | Easing | EasingFunction;
};

export type AnimationController = {
	updateDOM: (options?: AnimationOptions) => Promise<void>;
};

export function setHeroController(id: string, controller: AnimationController) {
	setContext(id, {
		...controller,
		updateDOM: async (options) => {
			await tick(); // update the dom for any changes
			await controller.updateDOM(options);
		}
	} satisfies AnimationController); // available for children to access
}

export function getHeroController(id: string) {
	const context = getContext(id) as AnimationController;
	if (!context || !context.updateDOM) {
		throw new Error(`Invalid context, no hero element with id (${id}) found`);
	}
	return context;
}
