<script>
	import Hero from '../../hero/hero.svelte';
</script>

<div class="m-4">
	<div class="mb-4">
		<span class="bg-blue-500 px-4 py-2 rounded-md text-white"
			><a href="/navigation/one">/navigation/one</a></span
		>
		<span class="bg-blue-500 px-4 py-2 rounded-md text-white"
			><a href="/navigation/two">/navigation/two</a></span
		>
	</div>
	<Hero id="/navigation" options={{ containerSize: 'incoming' }}>
		<slot />
	</Hero>
</div>
