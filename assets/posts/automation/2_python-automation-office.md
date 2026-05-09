# Python 自动化办公：Excel、PDF 与邮件处理实战

## 概述

Python 在自动化办公领域有着广泛的应用。本文介绍使用 Python 处理日常办公任务的核心技能：Excel 数据处理、PDF 文档操作、以及邮件自动发送，通过实际案例提升办公效率。

## Excel 数据处理

### 使用 openpyxl 读写 Excel

```python
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from datetime import datetime

class ExcelProcessor:
    def __init__(self, filename):
        self.filename = filename
        self.wb = None

    def create_workbook(self):
        self.wb = Workbook()
        return self.wb

    def load_workbook(self):
        self.wb = load_workbook(self.filename)
        return self.wb

    def write_data(self, sheet_name, data, headers=None):
        if sheet_name not in self.wb.sheetnames:
            ws = self.wb.create_sheet(sheet_name)
        else:
            ws = self.wb[sheet_name]

        start_row = 1
        if headers:
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.font = Font(bold=True, color="FFFFFF")
                cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
                cell.alignment = Alignment(horizontal="center")
            start_row = 2

        for row_idx, row_data in enumerate(data, start_row):
            for col_idx, value in enumerate(row_data, 1):
                ws.cell(row=row_idx, column=col_idx, value=value)

        # 自动调整列宽
        for col in range(1, len(data[0]) + 1):
            ws.column_dimensions[get_column_letter(col)].width = 15

        return ws

    def save(self):
        self.wb.save(self.filename)
```

### 数据分析与统计

```python
import pandas as pd
from openpyxl import load_workbook

def analyze_sales_report(excel_file):
    # 使用 pandas 读取
    df = pd.read_excel(excel_file, sheet_name='Sales')

    # 数据清洗
    df['日期'] = pd.to_datetime(df['日期'])
    df['销售额'] = pd.to_numeric(df['销售额'], errors='coerce')
    df = df.dropna()

    # 统计分析
    summary = {
        '总销售额': df['销售额'].sum(),
        '平均销售额': df['销售额'].mean(),
        '最高销售额': df['销售额'].max(),
        '最低销售额': df['销售额'].min(),
        '订单数量': len(df),
    }

    # 按月份汇总
    df['月份'] = df['日期'].dt.to_period('M')
    monthly = df.groupby('月份')['销售额'].agg(['sum', 'mean', 'count'])

    # 按产品分类汇总
    by_product = df.groupby('产品')['销售额'].sum().sort_values(ascending=False)

    return summary, monthly, by_product
```

## PDF 文档处理

### PDF 内容读取

```python
import PyPDF2
from pdfplumber import pdf

class PDFProcessor:
    def extract_text(self, pdf_path):
        """提取 PDF 文本内容"""
        texts = []
        with pdf(pdf_path) as pdf_file:
            for page in pdf_file.pages:
                text = page.extract_text()
                if text:
                    texts.append(text)
        return '\n'.join(texts)

    def extract_tables(self, pdf_path):
        """提取 PDF 中的表格"""
        tables = []
        with pdf(pdf_path) as pdf_file:
            for page in pdf_file.pages:
                page_tables = page.extract_tables()
                if page_tables:
                    tables.extend(page_tables)
        return tables

    def extract_metadata(self, pdf_path):
        """提取 PDF 元数据"""
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            metadata = reader.metadata
            return {
                'title': metadata.get('/Title', ''),
                'author': metadata.get('/Author', ''),
                'subject': metadata.get('/Subject', ''),
                'creator': metadata.get('/Creator', ''),
                'pages': len(reader.pages)
            }
```

### PDF 创建与合并

```python
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from PyPDF2 import PdfMerger

def create_pdf_from_text(output_path, content):
    """从文本创建 PDF"""
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    # 设置字体
    c.setFont("Helvetica", 12)

    # 写入内容
    y_position = height - 50
    for line in content.split('\n'):
        if y_position < 50:
            c.showPage()
            c.setFont("Helvetica", 12)
            y_position = height - 50
        c.drawString(50, y_position, line)
        y_position -= 20

    c.save()

def merge_pdfs(pdf_list, output_path):
    """合并多个 PDF"""
    merger = PdfMerger()
    for pdf in pdf_list:
        merger.append(pdf)
    merger.write(output_path)
    merger.close()
```

## 邮件自动处理

### 发送邮件

```python
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime

class EmailSender:
    def __init__(self, smtp_server, smtp_port, sender_email, sender_password):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.sender_email = sender_email
        self.sender_password = sender_password

    def send_email(self, to_email, subject, body, attachments=None):
        msg = MIMEMultipart()
        msg['From'] = self.sender_email
        msg['To'] = to_email
        msg['Subject'] = subject

        # 添加正文
        msg.attach(MIMEText(body, 'html'))

        # 添加附件
        if attachments:
            for attachment in attachments:
                with open(attachment, 'rb') as f:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f'attachment; filename={attachment}')
                    msg.attach(part)

        # 发送邮件
        with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.send_message(msg)

    def send_html_email(self, to_email, subject, html_content):
        msg = MIMEText(html_content, 'html')
        msg['From'] = self.sender_email
        msg['To'] = to_email
        msg['Subject'] = subject

        with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.send_message(msg)
```

### 批量发送报告邮件

```python
def send_daily_report():
    sender = EmailSender(
        smtp_server='smtp.gmail.com',
        smtp_port=587,
        sender_email='your_email@gmail.com',
        sender_password='your_app_password'
    )

    # 生成报告内容
    summary, monthly, by_product = analyze_sales_report('sales.xlsx')

    html_content = f"""
    <html>
    <body>
        <h2>销售日报 - {datetime.now().strftime('%Y-%m-%d')}</h2>
        <h3>数据概览</h3>
        <ul>
            <li>总销售额: ¥{summary['总销售额']:,.2f}</li>
            <li>平均销售额: ¥{summary['平均销售额']:,.2f}</li>
            <li>订单数量: {summary['订单数量']}</li>
        </ul>
        <h3>TOP 产品</h3>
        <table border="1">
            <tr><th>产品</th><th>销售额</th></tr>
            {''.join(f'<tr><td>{k}</td><td>¥{v:,.2f}</td></tr>' for k, v in by_product.head(5).items())}
        </table>
    </body>
    </html>
    """

    sender.send_html_email(
        to_email='team@company.com',
        subject=f'销售日报 - {datetime.now().strftime("%Y-%m-%d")}',
        html_content=html_content
    )
```

## 完整自动化流程示例

```python
def monthlyAutomation():
    """月度报告自动化流程"""
    # 1. 读取数据
    processor = ExcelProcessor('monthly_data.xlsx')
    processor.load_workbook()

    # 2. 数据分析
    summary, monthly, by_product = analyze_sales_report('monthly_data.xlsx')

    # 3. 生成新 Excel 报告
    new_processor = ExcelProcessor('月度汇总报告.xlsx')
    new_processor.create_workbook()
    new_processor.write_data('汇总', [summary.values()], summary.keys())
    new_processor.write_data('月度趋势', monthly.reset_index().values.tolist())
    new_processor.write_data('产品排名', by_product.reset_index().values.tolist())
    new_processor.save()

    # 4. 生成 PDF
    report_content = f"""
    月度销售报告
    日期: {datetime.now().strftime('%Y-%m')}

    总销售额: ¥{summary['总销售额']:,.2f}
    平均销售额: ¥{summary['平均销售额']:,.2f}
    订单数量: {summary['订单数量']}

    TOP 5 产品:
    {by_product.head(5).to_string()}
    """
    create_pdf_from_text('月度报告.pdf', report_content)

    # 5. 发送邮件
    sender = EmailSender(...)
    sender.send_email(
        to_email='manager@company.com',
        subject=f'月度报告 - {datetime.now().strftime("%Y-%m")}',
        body='请查收附件中的月度报告',
        attachments=['月度汇总报告.xlsx', '月度报告.pdf']
    )

    print("月度报告自动化流程完成！")
```

## 总结

Python 提供了丰富的库来处理办公自动化任务：openpyxl 处理 Excel、pdfplumber/PyPDF2 处理 PDF、smtplib 处理邮件。通过合理组合这些工具，可以大幅提升日常办公效率。
