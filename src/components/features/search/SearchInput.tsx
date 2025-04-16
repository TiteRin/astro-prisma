import {useEffect, useRef} from "react";
import _ from "lodash";

interface PageFindInterface {
    init: () => void;
    debouncedSearch: (query: string, options: object, delay: number) => Promise<{results: PageFindResultData[]}>
}

// Declare the global `pagefind` if it's loaded from /public
declare global {
    interface Window {
        pagefind?: PageFindInterface;
    }
}

type PageFindResultData = {
    meta: {
        title: string,
        summary: string
    },
    excerpt: string,
    url: string
};

export default function SearchInput() {

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load page find at focus
        async function initPageFind() {

            if (window.pagefind) {
                window.pagefind.init();
            }
        }

        inputRef?.current?.addEventListener('focus', initPageFind);

        return () => inputRef?.current?.removeEventListener('focus', initPageFind);
    }, []);

    const debouncedSearch = _.debounce(async (query: string) => {

        console.log(window.pagefind);

        if (!window.pagefind || !query) {
            return;
        }

        const { results } = await window.pagefind.debouncedSearch(query, {}, 700);
        console.log(results);
    }, 700)

    return <input
        ref={inputRef}
        type="search"
        placeholder="Rechercher parmi les fiches"
        aria-label="Rechercher parmi les fiches"
        onChange={(e) => debouncedSearch(e.target.value)}
    />
}