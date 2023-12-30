<script lang="ts">
	import { onMount } from 'svelte';
	import { getHeroController } from '../hero/hero_context';
	import BitSet from 'bitset';

	const NODES = 10;
	let nodes: { x: number; y: number }[] = [];
	let graph: BitSet[] = [];

	let canvasWidthPx: number;
	let canvasHeightPx: number;

	let nodeWidthPx = 30;
	let nodeHeightPx = 30;

	onMount(() => {
		graph = new Array(NODES);
		for (let i = 0; i < NODES; i++) {
			graph[i] = new BitSet();
			for (let j = 0; j < NODES; j++) {
				if (j > i) {
					graph[i].set(j, Math.random() < CONNECTION_DENSITY ? 1 : 0);
				} else {
					graph[i].set(j, graph[j].get(i));
				}
			}
		}

		nodes = new Array(NODES);
		resetNodes();
		controller.updateDOM({ animate: false });
	});

	let index = -1;
	const CONNECTION_DENSITY = 0.5;

	function randomArray<T>(len: number, gen: (i: number) => T) {
		return new Array(len).fill(0).map((_, i) => gen(i));
	}

	const controller = getHeroController('/graph');

	function resetNodes() {
		for (let i = 0; i < NODES; i++) {
			nodes[i] = {
				x: (i / (NODES - 1)) * 0.8 + 0.1, // index 0 = 10%, index n = 90%
				y: 0.1
			};
		}
	}

	function recalculateNodePositions() {
		resetNodes();

		nodes[index] = {
			x: 0.5,
			y: 0.5
		}; // center selected element

		// list of indices of all neighbors
		const Y_RADIUS = 0.2; // percentage
		let neighbors: number[] = [];
		for (let i = 0; i < NODES; i++) {
			if (graph[index].get(i)) {
				neighbors.push(i);
			}
		}

		for (let i = 0; i < neighbors.length; i++) {
			const theta = (i / neighbors.length) * 2 * Math.PI;
			nodes[neighbors[i]] = {
				// scale x radius so that percentages still preserve circular shape
				x: 0.5 + Y_RADIUS * (canvasHeightPx / canvasWidthPx) * Math.cos(theta),
				y: 0.5 + Y_RADIUS * Math.sin(theta)
			};
		}
	}
</script>

<div
	class="relative w-screen h-screen"
	bind:clientWidth={canvasWidthPx}
	bind:clientHeight={canvasHeightPx}
>
	{#each nodes as node, i}
		<button
			data-hero-key={i}
			class={`${
				i === index ? 'bg-sky-500' : 'bg-sky-300'
			} hover:bg-sky-500 text-white rounded-full absolute`}
			style="left: {node.x * 100}%; top: {node.y *
				100}%; width: {nodeWidthPx}px; height: {nodeHeightPx}px; transform: translate(-50%, -50%);"
			on:click={async () => {
				index = i;
				recalculateNodePositions();
				await controller.updateDOM();
			}}>{i}</button
		>
	{/each}
</div>
