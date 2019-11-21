import App from './App.svelte';
import * as Pahkat from "pahkat-jsbridge";

const app = new App({
	target: document.body,
	props: {
		Pahkat
	}
});

export default app;