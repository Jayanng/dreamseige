import json
import os

filepath = r'c:\Users\dell\Documents\VS_code\dreamsiege\contracts\out\BaseContract.sol\BaseContract.json'
with open(filepath, 'r') as f:
    data = json.load(f)
    bytecode = data['bytecode']['object']
    print(bytecode)
