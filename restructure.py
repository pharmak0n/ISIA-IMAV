import json
import sys

def main():
    # Correcting the file paths based on where the file was created and where it should be.
    input_path = '/Users/macbook/Documents/GitHub/ISIA-IMAV/csv/collezione.json'
    output_path = '/Users/macbook/Documents/GitHub/ISIA-IMAV/data/collezione.json' # The user-specified final location

    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            flat_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_path}")
        sys.exit(1)

    nodes = []
    links = []
    node_ids = set()
    tag_counts = {}

    for item in flat_data:
        item_id = item.get('Titolo')
        if not item_id or item_id in node_ids:
            continue

        item_node = {
            "id": item_id,
            "type": "item",
            "group": item.get('Tipologia'),
            "value": 1,
            "consigliati": item.get('Consigliati', ''),
            "descrizione": item.get('Breve descrizione', ''),
            "regista": item.get('Regista/Creatore', ''),
            "anno": item.get('Anno', ''),
            "valutazione": item.get('Valutazione (1-5)', ''),
            "wikiLink": item.get('Link Wikipedia', ''),
            "streamingLink": item.get('Link Streaming', '')
        }
        nodes.append(item_node)
        node_ids.add(item_id)

        old_tags = [t.strip() for t in item.get('Tag tematici (keywords)', '').split(',') if t.strip()]
        new_tags = item.get('nuovi_tag', [])
        all_tags = set(old_tags + new_tags)

        for tag_name in all_tags:
            if not tag_name: continue
            tag_counts[tag_name] = tag_counts.get(tag_name, 0) + 1
            links.append({"source": item_id, "target": tag_name})

    for tag_name, count in tag_counts.items():
        if tag_name not in node_ids:
            tag_node = {
                "id": tag_name,
                "type": "tag",
                "group": "tag",
                "value": count
            }
            nodes.append(tag_node)

    graph_data = {"nodes": nodes, "links": links}

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully restructured file and saved to {output_path}")

if __name__ == '__main__':
    main()