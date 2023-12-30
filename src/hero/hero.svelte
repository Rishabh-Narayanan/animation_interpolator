<script lang="ts">
	import type { AnimationControls } from 'motion';
	import { animate } from '.';
	import { afterUpdate, onMount } from 'svelte';
	import {
		setHeroController,
		type AnimationController,
		type AnimationOptions
	} from './hero_context';

	export let id: string;

	enum Elements {
		CONTENT = 'content',
		CONTAINER = 'container'
	}
	const DEFAULT_OPTIONS: AnimationOptions = {
		animate: true,
		containerSize: 'animate',
		durationSeconds: 0.7,
		easingFunction: (x) => {
			const c = 1.4;
			return x < 0.5
				? (Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c)) / 2
				: (Math.pow(2 * x - 2, 2) * ((c + 1) * (x * 2 - 2) + c) + 2) / 2;
		} // ease in out back
	};

	export let options = DEFAULT_OPTIONS;

	export let blacklist: string[] = [];
	let timeline: AnimationControls | undefined;

	let justMounted = true;
	let oldElement: HTMLElement;

	const get = (dataHeroObject: string) => {
		return document
			.getElementById(id)
			?.querySelector(`[data-hero-object="${dataHeroObject}"]`) as HTMLElement;
	};

	onMount(() => {
		oldElement = get(Elements.CONTENT)?.cloneNode(true) as HTMLElement;
	});

	let controller: AnimationController = {
		updateDOM: async (o) => {
			o = { ...DEFAULT_OPTIONS, ...o };

			let currentElement = get(Elements.CONTENT);
			let container = get(Elements.CONTAINER);

			if (!o.animate) {
				oldElement = currentElement.cloneNode(true) as HTMLElement;
				return; // dom is already updated
			}

			if (timeline) {
				timeline.finish(); // calls "finished" and swaps element
				await timeline.finished;
			}
			timeline = animate(container, oldElement, currentElement, blacklist, options, (incoming) => {
				oldElement = incoming.cloneNode(true) as HTMLElement;
			});

			await timeline.finished;
			timeline = undefined;
		}
	};

	afterUpdate(() => {
		// don't swap on the first mount (only when subsequent elements change)
		if (!justMounted) {
			controller.updateDOM();
		} else {
			justMounted = false;
		}
	});

	setHeroController(id, controller);

	// TODO: make original elements hidden, clone visible elements (updating dom should not affect variables)
</script>

<div class="relative" {id}>
	<div data-hero-object={Elements.CONTENT} class="w-fit h-fit">
		<slot />
	</div>
	<div data-hero-object={Elements.CONTAINER} class="w-fit h-fit" />
</div>
