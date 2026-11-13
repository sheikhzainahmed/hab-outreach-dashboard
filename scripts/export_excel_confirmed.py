import openpyxl, json

wb = openpyxl.load_workbook('/Users/zains/.gemini/antigravity/brain/c54d5951-022f-458d-9627-2bf6a7c2df14/.user_uploaded/media_1794582383043_dde7f9c3.xlsx', data_only=True)
sheet = wb['Confirmed Orders']

all_orders = []
for r in range(2, sheet.max_row + 1):
    vals = [sheet.cell(row=r, column=c).value for c in range(1, 11)]
    if not vals or not vals[0]: continue
    
    name = str(vals[0]).strip()
    raw_phone = str(vals[1] or '').strip()
    if raw_phone.endswith('.0'): raw_phone = raw_phone[:-2]
    
    email = str(vals[2] or '').strip()
    if email == '-': email = ''
    
    products = str(vals[3] or '').strip()
    address = str(vals[4] or '').strip().replace('\n', ', ')
    date_added = str(vals[5] or '').strip()
    raw_status = str(vals[6] or '').strip()
    tracking = str(vals[7] or '').strip()
    ship_date = str(vals[8] or '').strip()
    locked_by = str(vals[9] or '').strip()

    all_orders.append({
        'row': r,
        'name': name,
        'phone': raw_phone,
        'email': email,
        'products': products,
        'address': address,
        'date_added': date_added,
        'status': raw_status,
        'tracking': tracking,
        'ship_date': ship_date,
        'locked_by': locked_by
    })

out_path = '/Users/zains/Documents/hab-outreach-dashboard/prisma/confirmed_orders_latest.json'
with open(out_path, 'w') as f:
    json.dump(all_orders, f, indent=2)

print(f'Successfully wrote {len(all_orders)} orders to {out_path}')
