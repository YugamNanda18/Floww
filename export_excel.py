import json
import csv
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

JSON_PATH = os.path.join(os.path.dirname(__file__), 'students_manual_test_roster.json')
XLSX_PATH = os.path.join(os.path.dirname(__file__), 'students_manual_test_roster.xlsx')
CSV_PATH = os.path.join(os.path.dirname(__file__), 'students_manual_test_roster.csv')

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    students = json.load(f)

# Write CSV
fields = [
    'department', 'year', 'semester', 'batch', 'academicYear',
    'rollNumber', 'name', 'email', 'password', 'status',
    'totalDemanded', 'totalPaid', 'outstandingBalance',
    'lateFeeAccrued', 'scholarshipConcession', 'notes'
]

with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for s in students:
        writer.writerow(s)

print(f"CSV generated at: {CSV_PATH}")

# Create Excel Workbook
wb = openpyxl.Workbook()
ws_all = wb.active
ws_all.title = "All 160 Students"

headers = [
    "Department", "Year", "Semester", "Batch", "Academic Year",
    "Roll Number", "Student Name", "Email ID (Login)", "Password",
    "Fee Status", "Total Demanded (Rs)", "Total Paid (Rs)", "Outstanding Due (Rs)",
    "Late Fee (Rs)", "Scholarship (Rs)", "Testing Notes"
]

header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid") # Slate 800
header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
thin_border = Border(
    left=Side(style='thin', color='E2E8F0'),
    right=Side(style='thin', color='E2E8F0'),
    top=Side(style='thin', color='E2E8F0'),
    bottom=Side(style='thin', color='E2E8F0')
)

status_fills = {
    'Paid': PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid"),         # Light Green
    'Pending': PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid"),      # Light Yellow
    'Defaulter': PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid"),    # Light Red
    'Scholarship': PatternFill(start_color="E0E7FF", end_color="E0E7FF", fill_type="solid"),  # Light Indigo
    'Partial': PatternFill(start_color="FFEDD5", end_color="FFEDD5", fill_type="solid"),      # Light Orange
}

status_fonts = {
    'Paid': Font(name="Calibri", size=11, bold=True, color="166534"),
    'Pending': Font(name="Calibri", size=11, bold=True, color="854D0E"),
    'Defaulter': Font(name="Calibri", size=11, bold=True, color="991B1B"),
    'Scholarship': Font(name="Calibri", size=11, bold=True, color="3730A3"),
    'Partial': Font(name="Calibri", size=11, bold=True, color="9A3412"),
}

def format_sheet(ws, student_list):
    ws.views.sheetView[0].showGridLines = True
    ws.append(headers)

    # Style headers
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
    ws.row_dimensions[1].height = 28

    for row_idx, s in enumerate(student_list, start=2):
        row_data = [
            s['department'],
            f"Year {s['year']}",
            f"Sem {s['semester']}",
            s['batch'],
            s['academicYear'],
            s['rollNumber'],
            s['name'],
            s['email'],
            s['password'],
            s['status'],
            s['totalDemanded'],
            s['totalPaid'],
            s['outstandingBalance'],
            s['lateFeeAccrued'],
            s['scholarshipConcession'],
            s['notes']
        ]
        ws.append(row_data)

        # Style data row
        for col_idx in range(1, len(row_data) + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")

            # Center codes and status
            if col_idx in [1, 2, 3, 4, 5, 6, 9]:
                cell.alignment = Alignment(horizontal="center", vertical="center")

            # Currency format
            if col_idx in [11, 12, 13, 14, 15]:
                cell.number_format = '#,##0.00'
                cell.alignment = Alignment(horizontal="right", vertical="center")

            # Status highlight
            if col_idx == 10:
                st = s['status']
                if st in status_fills:
                    cell.fill = status_fills[st]
                    cell.font = status_fonts[st]
                cell.alignment = Alignment(horizontal="center", vertical="center")

        ws.row_dimensions[row_idx].height = 22

    # Auto adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or '')
            max_len = max(max_len, len(val_str))
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

# Populate All Students
format_sheet(ws_all, students)

# Populate Individual Department Sheets
depts = ['CSE', 'ECE', 'ME', 'CE']
for d in depts:
    dept_students = [s for s in students if s['department'] == d]
    ws_dept = wb.create_sheet(title=f"Dept - {d}")
    format_sheet(ws_dept, dept_students)

wb.save(XLSX_PATH)
print(f"Excel workbook generated successfully at: {XLSX_PATH}")
