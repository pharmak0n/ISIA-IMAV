import json
import csv
import sys

def normalize_tag(tag):
    """
    Normalizes a tag by converting it to lowercase and stripping whitespace.
    """
    return tag.lower().strip()

def convert_csv_to_json(input_csv_path, output_json_path):
    """
    Converts a CSV file to a JSON file in the format expected by the D3 bubble chart.

    Args:
        input_csv_path (str): The path to the input CSV file.
        output_json_path (str): The path to the output JSON file.
    """
    graph_data = {"nodes": [], "links": []}
    existing_node_ids = set()
    tag_values = {}

    with open(input_csv_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item_node = {
                "id": row["Titolo"],
                "type": "item",
                "group": row["Tipologia"],
                "value": 1,
                "consigliati": row.get("Consigliati", ""),
                "descrizione": row["Breve descrizione"],
                "regista": row.get("Regista/Creatore", ""),
                "anno": row["Anno"],
                "valutazione": row.get("Valutazione (1-5)", ""),
                "wikiLink": row.get("Link Wikipedia", ""),
                "streamingLink": row.get("Link Streaming", "")
            }

            if item_node["id"] not in existing_node_ids:
                graph_data["nodes"].append(item_node)
                existing_node_ids.add(item_node["id"])

            tags = [normalize_tag(tag) for tag in row["Tag tematici (keywords)"].split(",") if tag.strip()]
            for tag in tags:
                if tag not in existing_node_ids:
                    tag_node = {
                        "id": tag,
                        "type": "tag",
                        "group": "tag",
                        "value": 1
                    }
                    graph_data["nodes"].append(tag_node)
                    existing_node_ids.add(tag)
                    tag_values[tag] = 1
                else:
                    tag_values[tag] += 1
                    for node in graph_data["nodes"]:
                        if node["id"] == tag and node["type"] == "tag":
                            node["value"] = tag_values[tag]
                            break

                link = {
                    "source": item_node["id"],
                    "target": tag
                }
                graph_data["links"].append(link)

    with open(output_json_path, "w") as f:
        json.dump(graph_data, f, indent=2)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python table2json.py <input_csv> <output_json>")
        sys.exit(1)
    input_csv_path = sys.argv[1]
    output_json_path = sys.argv[2]
    convert_csv_to_json(input_csv_path, output_json_path)