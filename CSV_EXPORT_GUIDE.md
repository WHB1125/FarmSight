# 📊 CSV 导出指南

## 已导出的文件

✅ **export_products.csv** (3.0 KB)
- 13 个产品数据
- 包含：ID、名称、分类、单位、描述、图片URL等

✅ **export_market_prices.csv** (6.3 MB)
- 34,580 条市场价格记录
- 包含：产品ID、城市、市场名称、价格、日期等
- 数据范围：2025-10-12 至 2025-11-11

## 如何导入到 pgAdmin

### 方法 1：使用 COPY 命令（推荐）

```sql
-- 1. 先创建表结构（使用 database_export.sql 中的 CREATE TABLE 语句）

-- 2. 导入 products 数据
COPY products(id, name, category, unit, description, created_at, updated_at, image_url)
FROM '/path/to/export_products.csv'
DELIMITER ','
CSV HEADER;

-- 3. 导入 market_prices 数据
COPY market_prices(id, product_id, city, market_name, price, price_unit, date, source, created_at)
FROM '/path/to/export_market_prices.csv'
DELIMITER ','
CSV HEADER;
```

### 方法 2：使用 pgAdmin 图形界面

1. 打开 pgAdmin
2. 连接到您的数据库
3. 右键点击表名 → Import/Export Data
4. 选择 "Import"
5. 选择 CSV 文件
6. 勾选 "Header" 选项
7. 点击 "OK" 执行导入

### 方法 3：直接在 pgAdmin Query Tool 中执行

```sql
-- 使用 \copy 命令（客户端命令）
\copy products FROM 'export_products.csv' DELIMITER ',' CSV HEADER;
\copy market_prices FROM 'export_market_prices.csv' DELIMITER ',' CSV HEADER;
```

## 重新导出数据

如果需要重新导出或导出其他数据：

```bash
# 运行导出脚本
node export_to_csv.js
```

## 注意事项

- ⚠️ profiles 表因为 RLS（行级安全）限制无法通过 anon key 导出
- ✅ 可以通过 SQL 查询直接从 Supabase 获取 profiles 数据
- 📦 CSV 文件使用 UTF-8 编码
- 💡 market_prices 文件较大 (6.3 MB)，导入可能需要几分钟

## 获取 profiles 数据

在 Supabase SQL Editor 或 pgAdmin 中运行：

```sql
SELECT * FROM profiles;
```

然后复制结果或使用 pgAdmin 的导出功能。
