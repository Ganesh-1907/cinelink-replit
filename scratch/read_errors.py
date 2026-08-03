import re

with open('scratch/eslint_output.txt', 'r') as f:
    lines = f.readlines()

current_file = None
file_errors = {}

for line in lines:
    line = line.strip()
    if not line:
        continue
    # Check if this line is a file path
    if line.startswith('/') or (line.endswith('.tsx') and '/' in line):
        current_file = line
        file_errors[current_file] = []
    elif 'prettier/prettier' not in line and current_file:
        if ('error' in line or 'warning' in line) and not line.startswith('✖'):
            file_errors[current_file].append(line)

with open('scratch/filtered_errors.txt', 'w') as out:
    for file, errs in file_errors.items():
        if errs:
            out.write(f"\nFile: {file}\n")
            for err in errs:
                out.write(f"  {err}\n")
