import os
import re

md_file = 'umldiagrams.md'
out_dir = 'diagrams'

with open(md_file, 'r', encoding='utf-8') as f:
    content = f.read()

# The plantuml blocks are inside ```plantuml ... ```
# and we can extract whatever is between @startuml and @enduml
# We can just match the block ```plantuml ... ``` and save its content.
pattern = re.compile(r'```plantuml\s+(.*?)\s+```', re.DOTALL)
matches = pattern.findall(content)

for match in matches:
    # Try to find the name from @startuml [name]
    name_match = re.search(r'@startuml\s+(\w+)', match)
    if name_match:
        name = name_match.group(1)
    else:
        name = f"diagram_{hash(match)}"
    
    file_path = os.path.join(out_dir, f"{name}.puml")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(match.strip() + "\n")
    print(f"Extracted {name}.puml")
