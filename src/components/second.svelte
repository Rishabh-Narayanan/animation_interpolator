<script lang="ts">
	export let showingFirst: boolean = true;

	function randomArray(n: number) {
		let array = new Array(n);
		for (let i = 0; i < n; i++) {
			array[i] = i;
		}
		// shuffle
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}

		return array;
	}
</script>

{#if showingFirst}
	<div class="grid grid-cols-5 gap-4">
		{#each randomArray(50) as number}
			<div
				data-hero-key={number}
				data-hero-transition="scale"
				class="px-10 py-3 rounded-md bg-slate-100 text-center cursor-pointer pointer-events-none"
			>
				{number}
			</div>
		{/each}
	</div>
{:else}
	<div class="grid grid-cols-6 gap-4">
		{#each randomArray(30) as number}
			<div
				data-hero-key={number}
				data-hero-transition="scale"
				class="px-10 py-3 rounded-md bg-slate-100 text-center cursor-pointer pointer-events-none"
			>
				{number}
			</div>
		{/each}
	</div>
{/if}
