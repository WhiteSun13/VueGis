<script>
export function getElibrarySearchLink(query) {
    return `https://elibrary.ru/query_results.asp?querybox_name=&authors_all=&titles_all=&rubrics_all=034100|034191|384315&changed=1&queryid=&ftext=${query}&where_name=on&where_abstract=on&where_fulltext=on&where_keywords=on&where_references=&type_article=on&type_disser=on&type_book=on&type_report=on&type_conf=on&type_patent=on&type_preprint=on&type_grant=on&type_dataset=on&search_itemboxid=&search_morph=on&begin_year=0&end_year=0&issues=all&orderby=rank&order=rev&queryboxid=0&save_queryboxid=0`;
}

export function getYandexSearchLink(query) {
    return `https://ya.ru/search/?text=${query} Археология`;
}

export function getGoogleSearchLink(query) {
    return `https://www.google.com/search?q=${query} Археология`;
}
</script>