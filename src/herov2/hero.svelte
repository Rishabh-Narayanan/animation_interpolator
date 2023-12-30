<script lang="ts">
	import type { AnimationControls } from 'motion';
	import { animate, type AnimationParams, type Updater } from '.';

	let container: HTMLElement;
	let currentElement: HTMLElement;
	let incomingElement: HTMLElement;

	export let options: AnimationParams = {
		containerSize: 'animate',
		durationSeconds: 0.7,
		easingFunction: (x) => {
			const c = 1.4;
			return x < 0.5
				? (Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c)) / 2
				: (Math.pow(2 * x - 2, 2) * ((c + 1) * (x * 2 - 2) + c) + 2) / 2;
		} // ease in out back
	};

	export let blacklist: string[] = [];

	let timeline: AnimationControls | undefined;

	export const update: Updater = async (builder) => {
		if (timeline !== undefined) {
			timeline.cancel(); // calls "finished" and swaps element
			await timeline.finished; // wait till finished before moving on
		}

		timeline = animate(container, currentElement, incomingElement, builder, blacklist, options);
	};
</script>

<div class="relative">
	<div data-hero-object="content" class="w-fit h-fit" bind:this={currentElement}>
		<slot />
	</div>
	<div data-hero-object="incoming-content" class="w-fit h-fit" bind:this={incomingElement} />
	<div data-hero-object="floating-container" bind:this={container} />
</div>
