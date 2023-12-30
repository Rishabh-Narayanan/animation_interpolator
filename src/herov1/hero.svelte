<script lang="ts">
	import { createAnimationTimeline, type EasingType, type Updater } from '.';

	let container: HTMLElement;
	let outgoing: HTMLElement;
	let current: HTMLElement;
	let floating: HTMLElement;

	export let duration: number = 0.7;
	export let easing: EasingType = 'ease-in-out'
	// (x) => {
	// 	const c1 = 1.70158;
	// 	const c2 = c1 * 1.525;
	// 	return x < 0.5
	// 		? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
	// 		: (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
	// }; // ease in out back

	export let animateContainer: boolean = true;
	export let blacklist: string[] = ['name'];

	export const update: Updater = (params) => {
		const timeline = createAnimationTimeline(
			container,
			outgoing,
			current,
			floating,
			blacklist,
			duration,
			easing,
			animateContainer,
			params
		);
	};
</script>

<div class="relative">
	<div data-hero-object="container" bind:this={container} />
	<div data-hero-object="outgoing" bind:this={outgoing} class="w-fit h-fit" />
	<div data-hero-object="current" bind:this={current} class="w-fit h-fit">
		<slot />
	</div>
	<div data-hero-object="floating" bind:this={floating} />
</div>
