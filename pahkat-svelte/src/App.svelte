<script>
	export let Pahkat;

	const rpc = Pahkat.rpc
	let searchQuery = ""
	$: searchResults = rpc.searchByLanguage(searchQuery)
	let responders = window.pahkatResponders

	setInterval(() => {
		responders = window.pahkatResponders
	}, 100)

	function totalSizeBytes(result) {
		return Object.values(Object.values(result.packages))
			.map(resp => resp.package)
			.map(pkg => pkg.installer.size)
			.reduce((acc, cur) => acc + cur, 0)
	}

	function totalInstalledSizeBytes(result) {
		return Object.values(Object.values(result.packages))
			.map(resp => resp.package)
			.map(pkg => pkg.installer.installedSize)
			.reduce((acc, cur) => acc + cur, 0)
	}

	function uninstall(result) {
		var keys = Object.keys(result.packages)
		rpc.uninstall(keys)
	}

</script>


<style>
	h1 {
		color: purple;
	}
</style>

<pre>
Responders: {JSON.stringify(Object.keys(responders))}
</pre>

<input bind:value={searchQuery} placeholder="Language search">

{#await searchResults}
Loading...
{:then results}
{#if Object.keys(results).length}
<ul>
{#each Object.entries(results) as [bcp47Key, result]}
<li>
<strong>{result.languageName}</strong>
<ul>
{#each Object.values(result.packages) as response}
<li>{response.package.nativeName}</li>
{/each}
</ul>
<div>Size: {totalSizeBytes(result)}</div>
<div>Installed size: {totalInstalledSizeBytes(result)}</div>
<pre>{JSON.stringify(result.packages, null, 2)}</pre>
<button on:click={() => uninstall(result)}>Uninstall</button>
</li>
{/each}
</ul>
{:else}
{#if searchQuery}
<div>No results.</div>
{/if}
{/if}
{:catch error}
<div>There was an error: {error.message}</div>
{/await}