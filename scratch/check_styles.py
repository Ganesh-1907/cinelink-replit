import re

files_to_check = [
    '/home/ganesh/Desktop/BYV/cine-link/cinelink-replit/components/LiquidNav.tsx',
    '/home/ganesh/Desktop/BYV/cine-link/cinelink-replit/screens/DiscoverScreen.tsx',
    '/home/ganesh/Desktop/BYV/cine-link/cinelink-replit/screens/AuthScreen.tsx'
]

for filepath in files_to_check:
    print(f"\nChecking file: {filepath.split('/')[-1]}")
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Find all stylesheet definitions (inside StyleSheet.create)
    styles_block = re.search(r'const styles = StyleSheet\.create\(\{(.*?)\}\);', content, re.DOTALL)
    defined_styles = set()
    if styles_block:
        # Find keys in the stylesheet
        keys = re.findall(r'^\s*([a-zA-Z0-9_]+)\s*:', styles_block.group(1), re.MULTILINE)
        defined_styles = set(keys)
    else:
        print("  No StyleSheet.create block found!")
        
    # Find all references to styles.xxx
    referenced_styles = set(re.findall(r'styles\.([a-zA-Z0-9_]+)', content))
    
    missing = referenced_styles - defined_styles
    unused = defined_styles - referenced_styles
    
    if missing:
        print(f"  ❌ Referenced but NOT defined: {sorted(list(missing))}")
    else:
        print("  ✅ All referenced styles are defined!")
        
    if unused:
        print(f"  ⚠️ Defined but NOT used: {sorted(list(unused))}")
