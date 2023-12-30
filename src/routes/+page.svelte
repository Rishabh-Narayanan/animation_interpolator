<script lang="ts">
	import Hero from '../hero/hero.svelte';
	import First from '../components/first.svelte';
	import Second from '../components/second.svelte';

	let showingFirst = true;
</script>

<div class="p-4 w-screen h-screen flex flex-col gap-4 bg-slate-100 items-center">
	<button
		class="bg-sky-500 hover:bg-sky-600 text-white rounded-md px-4 py-2 w-fit"
		on:click={() => {
			showingFirst = !showingFirst;
		}}>Swap</button
	>

	<div class="w-full h-full bg-white border border-slate-200 p-2 rounded-lg flex flex-col gap-1">
		<div class="rounded-lg border border-slate-200 p-6 w-fit h-fit">
			<Hero id="/">
				{#if showingFirst}
					<Second {showingFirst} />
				{:else}
					<Second {showingFirst} />
				{/if}
			</Hero>
		</div>
	</div>
</div>
