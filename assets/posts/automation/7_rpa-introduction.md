# RPA 机器人流程自动化：概念与实践

> RPA 将人工重复性操作自动化，Python 生态提供了完整的工具链，从桌面自动化到文档处理全覆盖。

---

## 一、RPA vs 传统自动化

| 维度 | 传统自动化（API/脚本） | RPA |
|------|----------------------|-----|
| 依赖 | 需要 API 接口 | 不依赖，操作 UI |
| 适用系统 | 现代系统 | 任何系统（含传统遗留系统） |
| 开发难度 | 高 | 低 |
| 维护成本 | 低 | 高（UI 变化需更新） |
| 速度 | 快 | 受限于 UI 渲染速度 |

---

## 二、桌面自动化（pyautogui）

```python
import pyautogui
import time

# 安全设置：鼠标移到角落可紧急停止
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.5  # 每次操作后暂停 0.5s

def login_to_app(username: str, password: str):
    # 等待应用启动
    time.sleep(2)

    # 截图定位元素（比坐标更稳定）
    login_btn = pyautogui.locateOnScreen('images/login_button.png', confidence=0.9)
    if not login_btn:
        raise RuntimeError("找不到登录按钮")

    # 点击并输入
    pyautogui.click(login_btn)
    pyautogui.hotkey('ctrl', 'a')
    pyautogui.typewrite(username, interval=0.05)
    pyautogui.press('tab')
    pyautogui.typewrite(password, interval=0.05)
    pyautogui.press('enter')

    # 等待登录完成
    time.sleep(2)
    success = pyautogui.locateOnScreen('images/dashboard.png', confidence=0.8)
    return bool(success)
```

---

## 三、Office 自动化

### 3.1 Excel 处理（openpyxl）

```python
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.chart import BarChart, Reference
import re

def process_sales_report(input_file: str, output_file: str):
    wb = load_workbook(input_file)
    ws = wb.active

    # 读取数据
    data = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[0]:  # 跳过空行
            data.append(row)

    # 计算汇总并写入
    total_sheet = wb.create_sheet("汇总")
    headers = ["月份", "总销售额", "订单数", "平均客单价"]
    for col, h in enumerate(headers, 1):
        cell = total_sheet.cell(row=1, column=col, value=h)
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="4472C4")

    # 添加图表
    chart = BarChart()
    chart.title = "月度销售趋势"
    data_ref = Reference(total_sheet, min_col=2, min_row=1, max_row=13)
    chart.add_data(data_ref, titles_from_data=True)
    total_sheet.add_chart(chart, "F2")

    wb.save(output_file)
    print(f"报告已生成: {output_file}")
```

### 3.2 Word 文档生成（python-docx）

```python
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def generate_report(title: str, data: list, output_path: str):
    doc = Document()

    # 标题
    heading = doc.add_heading(title, level=1)
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # 表格
    table = doc.add_table(rows=1, cols=4)
    table.style = 'Table Grid'
    header_cells = table.rows[0].cells
    for i, text in enumerate(["序号", "项目", "金额", "状态"]):
        header_cells[i].text = text

    for i, row in enumerate(data, 1):
        cells = table.add_row().cells
        cells[0].text = str(i)
        cells[1].text = row['name']
        cells[2].text = f"¥{row['amount']:,.2f}"
        cells[3].text = row['status']

    doc.save(output_path)
```

---

## 四、邮件自动化

```python
import smtplib
import imaplib
import email
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path

class EmailBot:
    def __init__(self, user: str, password: str, host: str = "smtp.gmail.com"):
        self.user = user
        self.password = password
        self.smtp_host = host

    def send(self, to: list, subject: str, body: str, attachments: list = None):
        msg = MIMEMultipart()
        msg['From']    = self.user
        msg['To']      = ', '.join(to)
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html', 'utf-8'))

        for filepath in (attachments or []):
            with open(filepath, 'rb') as f:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="{Path(filepath).name}"')
            msg.attach(part)

        with smtplib.SMTP(self.smtp_host, 587) as server:
            server.starttls()
            server.login(self.user, self.password)
            server.sendmail(self.user, to, msg.as_string())
        print(f"邮件已发送至: {to}")

    def fetch_unread(self, folder: str = "INBOX", limit: int = 10):
        with imaplib.IMAP4_SSL(self.smtp_host.replace('smtp', 'imap')) as mail:
            mail.login(self.user, self.password)
            mail.select(folder)
            _, msg_nums = mail.search(None, 'UNSEEN')
            results = []
            for num in msg_nums[0].split()[-limit:]:
                _, data = mail.fetch(num, '(RFC822)')
                msg = email.message_from_bytes(data[0][1])
                results.append({
                    'subject': msg.get('Subject', ''),
                    'from':    msg.get('From', ''),
                    'body':    self._get_body(msg),
                })
            return results

    def _get_body(self, msg):
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == 'text/plain':
                    return part.get_payload(decode=True).decode('utf-8', errors='ignore')
        return msg.get_payload(decode=True).decode('utf-8', errors='ignore')
```

---

## 五、异常处理与告警

```python
import functools
import traceback
import logging

logger = logging.getLogger(__name__)

def rpa_task(max_retries: int = 3, screenshot_on_fail: bool = True):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_retries + 1):
                try:
                    result = func(*args, **kwargs)
                    logger.info(f"任务 {func.__name__} 成功（第 {attempt} 次）")
                    return result
                except Exception as e:
                    logger.warning(f"任务 {func.__name__} 第 {attempt} 次失败: {e}")
                    if screenshot_on_fail:
                        pyautogui.screenshot(f"error_{func.__name__}_{attempt}.png")
                    if attempt == max_retries:
                        logger.error(f"任务 {func.__name__} 最终失败:\n{traceback.format_exc()}")
                        raise
                    time.sleep(attempt * 5)  # 指数退避
        return wrapper
    return decorator

@rpa_task(max_retries=3, screenshot_on_fail=True)
def daily_report_task():
    login_to_app("user", "pass")
    download_report()
    process_report()
    send_report()
```

---

## 总结

Python RPA 工具选型：
- **pyautogui**：屏幕操作（鼠标/键盘/截图定位）
- **openpyxl/python-docx**：Office 文档生成
- **smtplib/imaplib**：邮件收发
- **Playwright/Selenium**：Web 自动化（更稳定）

核心原则：**幂等性**（可重跑）、**截图留证**（便于调试）、**重试机制**（应对偶发故障）。

---

*本文作者：林墨川 | 更新时间：2024年*
