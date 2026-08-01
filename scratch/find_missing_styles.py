import re

with open('/home/ganesh/Desktop/BYV/cine-link/cinelink-replit/screens/HomeScreen.tsx', 'r') as f:
    content = f.read()

# Find all stylesheet definitions (inside StyleSheet.create)
styles_block = re.search(r'const styles = StyleSheet\.create\(\{(.*?)\}\);', content, re.DOTALL)
defined_styles = set()
if styles_block:
    # Find keys in the stylesheet
    keys = re.findall(r'^\s*([a-zA-Z0-9_]+)\s*:', styles_block.group(1), re.MULTILINE)
    defined_styles = set(keys)

# Find all references to styles.xxx
referenced_styles = set(re.findall(r'styles\.([a-zA-Z0-9_]+)', content))

print("DEFINED STYLES:")
print(sorted(list(defined_styles)))
print("\nREFERENCED STYLES:")
print(sorted(list(referenced_styles)))
print("\nREFERENCED BUT NOT DEFINED:")
missing = referenced_styles - defined_styles
print(sorted(list(missing)))
