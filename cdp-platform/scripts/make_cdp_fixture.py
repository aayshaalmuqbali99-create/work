"""Build a SYNTHETIC test workbook shaped like the Microsoft Forms export of the CDP evaluation.

It is NOT real survey data. It only reproduces the structure (Sheet1, columns A–AX, bilingual headers
with line breaks and extra spaces) and the reference counts of the (1-137) file (135 responses; 1 and 2 were tests), so the import and the
dashboard can be tested without the real responses. Names and comments are invented.

    python3 scripts/make_cdp_fixture.py tests/cdp/fixtures
"""
import random
import sys
from pathlib import Path

from openpyxl import Workbook

random.seed(2026)
out_dir = Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "tests/cdp/fixtures")
out_dir.mkdir(parents=True, exist_ok=True)

# (column, English header, Arabic header) — Arabic wording as given by the programme team.
Q = [
    ("F", "Were the objectives of the Career Development Programme (CDP) clear to you?", "هل كانت أهداف برنامج التطوير الوظيفي واضحة لكم؟"),
    ("G", "Was the CDP implemented in a clear and organized manner?", "هل نُفّذ برنامج التطوير الوظيفي بطريقة واضحة ومنظمة؟"),
    ("H", "Was the CDP relevant to your work?", "هل كان برنامج التطوير الوظيفي ذا صلة بعملكم؟"),
    ("I", "Did the CDP contribute to your professional development?", "هل ساهم برنامج التطوير الوظيفي في تطويركم المهني؟"),
    ("J", "Was the information in AGIOPS or the Excel file shared with you clear?", "هل كانت المعلومات في AGIOPS أو ملف Excel الذي تمت مشاركته معكم واضحة؟"),
    ("K", "Were the courses available and accessible when needed?", "هل كانت الدورات متاحة ويمكن الوصول إليها عند الحاجة؟"),
    ("L", "Was the course content clear and easy to understand?", "هل كان محتوى الدورات واضحًا وسهل الفهم؟"),
    ("M", "Was the course content relevant to your work?", "هل كان محتوى الدورات ذا صلة بعملكم؟"),
    ("N", "Did the courses help you gain new knowledge and skills?", "هل ساعدتكم الدورات على اكتساب معارف ومهارات جديدة؟"),
    ("O", "Were you able to apply what you learned in your work?", "هل تمكنتم من تطبيق ما تعلمتموه في عملكم؟"),
    ("P", "Did the courses help improve your performance at work?", "هل ساهمت الدورات في تحسين أدائكم في العمل؟"),
    ("Q", "Did you face any challenges with the e-learning courses?", "هل واجهتم أي تحديات في الدورات الإلكترونية؟"),
    ("R", "Did you receive clear guidance on using AGIOPS?", "هل تلقيتم إرشادات واضحة حول استخدام AGIOPS؟"),
    ("S", "Did you receive clear guidance on updating your progress?", "هل تلقيتم إرشادات واضحة حول تحديث تقدمكم؟"),
    ("T", "Were the OJT topics explained clearly?", "هل تم شرح موضوعات التدريب أثناء العمل بوضوح؟"),
    ("U", "Were the OJT topics relevant to your work?", "هل كانت موضوعات التدريب أثناء العمل ذات صلة بعملكم؟"),
    ("V", "Was the planned OJT actually delivered?", "هل تم تقديم التدريب أثناء العمل المخطط له فعليًا؟"),
    ("W", "Were the explanations during the training clear and effective?", "هل كانت الشروحات أثناء التدريب واضحة وفعّالة؟"),
    ("X", "Were you given practical opportunities to apply what you learned?", "هل أُتيحت لكم فرص عملية لتطبيق ما تعلمتموه؟"),
    ("Y", "Was your recorded training progress accurate?", "هل كان تقدمكم التدريبي المسجل دقيقًا؟"),
    ("Z", "Did the OJT help you develop your skills?", "هل ساعدكم التدريب أثناء العمل على تطوير مهاراتكم؟"),
    ("AA", "Did the OJT help you perform your tasks more independently?", "هل ساعدكم التدريب أثناء العمل على أداء مهامكم باستقلالية أكبر؟"),
    ("AB", "Did you face any challenges during the OJT?", "هل واجهتم أي تحديات أثناء التدريب أثناء العمل؟"),
    ("AC", "Did the Huawei OMS team cooperate with you effectively?", "هل تعاون فريق Huawei OMS معكم بفاعلية؟"),
    ("AD", "Did the team take the initiative to transfer knowledge to you?", "هل بادر الفريق إلى نقل المعرفة إليكم؟"),
    ("AE", "Were the training materials useful and appropriate?", "هل كانت المواد التدريبية مفيدة وملائمة؟"),
    ("AF", "Did you receive sufficient support from the Huawei OMS team regarding CDP-T?", "هل تلقيتم دعمًا كافيًا من فريق Huawei OMS بشأن CDP‑T؟"),
    ("AG", "Did you receive sufficient support from the Huawei OMS team regarding AGIOPS?", "هل تلقيتم دعمًا كافيًا من فريق Huawei OMS بشأن AGIOPS؟"),
    ("AH", "Did the team respond to your questions and requests in a timely manner?", "هل استجاب الفريق لأسئلتكم وطلباتكم في الوقت المناسب؟"),
    ("AI", "Did the team follow up on your training progress effectively?", "هل تابع الفريق تقدمكم التدريبي بفاعلية؟"),
    ("AJ", "Did the team demonstrate professional behavior throughout the programme?", "هل أظهر الفريق سلوكًا مهنيًا طوال البرنامج؟"),
    ("AK", "Did you feel free to ask the team questions?", "هل شعرتم بحرية طرح الأسئلة على الفريق؟"),
    ("AL", "Did the team welcome your opinions and accept your feedback?", "هل رحّب الفريق بآرائكم وتقبّل ملاحظاتكم؟"),
    ("AM", "Did the team empower you to take ownership of your development?", "هل مكّنكم الفريق من تولّي مسؤولية تطويركم؟"),
    ("AN", "Did you face any challenges while working with the Huawei OMS team?", "هل واجهتم أي تحديات أثناء العمل مع فريق Huawei OMS؟"),
    ("AO", "Overall, were you satisfied with the support provided by the Huawei OMS team?", "بشكل عام، هل كنتم راضين عن الدعم المقدم من فريق Huawei OMS؟"),
    ("AP", "Please mention any unmet training requests and/or suggestions to improve Huawei OMS team support.", "يرجى ذكر أي طلبات تدريبية لم تتم تلبيتها و/أو اقتراحات لتحسين دعم فريق Huawei OMS."),
    ("AQ", "Overall, are you satisfied with the Career Development Programme (CDP)?", "بشكل عام، هل أنتم راضون عن برنامج التطوير الوظيفي؟"),
    ("AR", "Overall, are you satisfied with CDP-T?", "بشكل عام، هل أنتم راضون عن CDP‑T؟"),
    ("AS", "Overall, are you satisfied with the On-the-Job Training (OJT)?", "بشكل عام، هل أنتم راضون عن التدريب أثناء العمل؟"),
    ("AT", "What are your recommendations to improve the CDP?", "ما توصياتكم لتحسين برنامج التطوير الوظيفي؟"),
    ("AU", "Names of the people (Omantel or Huawei OMS) who provided support", "أسماء الأشخاص الذين قدموا الدعم"),
    ("AV", "Describe their outstanding contributions", "وصف المساهمات المتميزة"),
    ("AW", "Message of thanks and appreciation", "رسائل الشكر والتقدير"),
]
OPEN = {"AP", "AT", "AU", "AV", "AW"}
SAT = {"AQ": (33, 45, 57), "AR": (37, 41, 57), "AS": (38, 43, 54), "AO": (48, 43, 44)}
DEPTS = [("Network and Facilities Operations", 100), ("Facility Operation", 19), ("Electrotechnical", 13), ("Physical Security", 3)]
LABEL = {"y": "Yes - نعم", "p": "To some extent - إلى حد ما", "n": "No - لا"}
N = 135

def col_idx(letters):
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n

depts = [d for d, c in DEPTS for _ in range(c)]
random.shuffle(depts)

answers = {}
for col, (y, p, n) in SAT.items():
    vals = ["y"] * y + ["p"] * p + ["n"] * n
    random.shuffle(vals)
    answers[col] = vals

RECS = [
    "More hands-on practical training on real equipment, not only online courses.",
    "نحتاج إلى تدريب عملي في الموقع مع مدرب متخصص.",
    "Courses should be relevant to my job role in facility operation.",
    "يجب توفير وقت مخصص للتدريب لأن ضغط العمل كبير.",
    "The plan was not clear at the beginning, please share a clear schedule.",
    "Please assign a specialist trainer for each team. Eng. Test Alpha helped me a lot.",
    "تحسين الوصول إلى منصة AGIOPS وتوضيح الخطة.",
    "لا يوجد",
    "N/A",
    "Contact me on 99123456 or test.person@example.com for details.",
    "ملاءمة الدورات لطبيعة العمل ضعيفة، نحتاج دورات مرتبطة بتخصصنا.",
]
HUAWEI = [
    "Faster response to requests and better follow-up.",
    "طلبنا تدريب عملي على أنظمة الطاقة ولم يتم تلبيته.",
    "More time for practical sessions with the trainer.",
    "-",
]
NAMES = ["Test Alpha", "Sample Bravo", "اختبار تجريبي", "Demo Charlie, Test Delta"]

wb = Workbook()
ws = wb.active
ws.title = "Sheet1"
headers = {1: "ID", 2: "Start time", 3: "Completion time", 4: "Email", 5: "Name"}
for col, en, ar in Q:
    headers[col_idx(col)] = f"  {en}\n{ar}  " if col not in OPEN else f"{en}\n\n{ar}"
headers[col_idx("AX")] = "Department / Operational Area\nالقسم / المجال التشغيلي"
for i, h in headers.items():
    ws.cell(row=1, column=i, value=h)

for r in range(N):
    row = r + 2
    ws.cell(row=row, column=1, value=r + 1)
    ws.cell(row=row, column=2, value="2026-10-01 09:00:00")
    ws.cell(row=row, column=3, value="2026-10-01 09:10:00")
    ws.cell(row=row, column=4, value=f"respondent{r + 1:03d}@example.com")
    ws.cell(row=row, column=5, value=f"Respondent Fake{r + 1:03d}")
    ws.cell(row=row, column=col_idx("AX"), value=depts[r] + ("  " if r % 9 == 0 else ""))
    for col, _, _ in Q:
        c = col_idx(col)
        if col in SAT:
            ws.cell(row=row, column=c, value=LABEL[answers[col][r]])
        elif col in OPEN:
            if col == "AT" and r % 2 == 0:
                ws.cell(row=row, column=c, value=RECS[(r // 2) % len(RECS)])
            elif col == "AP" and r % 5 == 0:
                ws.cell(row=row, column=c, value=HUAWEI[(r // 5) % len(HUAWEI)])
            elif col == "AU" and r % 10 == 0:
                ws.cell(row=row, column=c, value=NAMES[(r // 10) % len(NAMES)])
            elif col == "AV" and r % 10 == 0:
                ws.cell(row=row, column=c, value="Test Alpha explained every OJT step patiently.")
            elif col == "AW" and r % 10 == 0:
                ws.cell(row=row, column=c, value="شكرا للمهندس اختبار تجريبي على دعمه المستمر.")
        else:
            if r % 23 == 7:
                continue  # some blank answers
            v = random.choices(["y", "p", "n"], weights=[4, 3, 3])[0]
            ws.cell(row=row, column=c, value=LABEL[v])

path = out_dir / "cdp-synthetic-135.xlsx"
wb.save(path)
print(path)

# --invalid <dir>: also write broken variants used by tests/cdp/e2e.cjs
if "--invalid" in sys.argv:
    from openpyxl import load_workbook
    inv = Path(sys.argv[sys.argv.index("--invalid") + 1])
    inv.mkdir(parents=True, exist_ok=True)
    b = load_workbook(path); b["Sheet1"].delete_cols(col_idx("AX")); b.save(inv / "no-dept.xlsx")
    b = load_workbook(path); s = b["Sheet1"]; s.delete_cols(col_idx("AQ"))
    for r in range(2, 40):
        s.cell(row=r, column=col_idx("F")).value = None
    b.save(inv / "missing-aq.xlsx")
    (inv / "not-excel.xlsx").write_text("not a workbook")
    print(inv)
