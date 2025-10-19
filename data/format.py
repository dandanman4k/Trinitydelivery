import json

# Load the JSON file
with open("C:/Users/danda/OneDrive/Documents/Projects/TrinityDelivery/data/stock.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Convert string numbers to integers for id, price, and amount
for item in data:
    for key in ("id", "price", "amount"):
        value = item.get(key)
        if isinstance(value, str) and value.isdigit():
            item[key] = int(value)

# Save back to a new file (or overwrite the original)
with open("data_fixed.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✅ JSON cleaned and saved to data_fixed.json")
