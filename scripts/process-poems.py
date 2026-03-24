"""
诗词数据处理管线 (Data Pipeline)
================================
从 chinese-poetry 开源仓库提取经典诗词 → 繁体转简体 → 按联/句切分 → 输出干净的 JSON

运行方式:
  1. 先克隆数据源:  git clone --depth 1 https://github.com/chinese-poetry/chinese-poetry.git /tmp/chinese-poetry
  2. 然后运行:      python3 scripts/process-poems.py

输出: scripts/poem-chunks.json (供下一步 embedding + 入库使用)
"""

import json
import os
import re
from typing import TypedDict

# 繁体→简体转换
from opencc import OpenCC
cc = OpenCC('t2s')  # Traditional to Simplified

# ============================================================
# 配置
# ============================================================
REPO_PATH = "/tmp/chinese-poetry"

# Tier1 诗人 (全部作品入库)
TIER1_TANG_POETS = [
    '李白', '杜甫', '王维', '白居易', '李商隐', '杜牧',
    '王昌龄', '孟浩然', '刘禹锡', '韩愈', '柳宗元',
    '岑参', '高适', '温庭筠', '韦应物', '王之涣',
    '贺知章', '张九龄', '陈子昂', '骆宾王', '李贺',
    '杜审言', '宋之问', '王勃', '卢照邻', '张若虚'
]

TIER1_SONG_POETS = [
    '苏轼', '辛弃疾', '李清照', '陆游', '柳永',
    '晏殊', '欧阳修', '秦观', '周邦彦', '姜夔',
    '吴文英', '晏几道', '贺铸', '张先', '范仲淹'
]


# ============================================================
# 数据结构
# ============================================================
class PoemRecord(TypedDict):
    title: str
    author: str
    dynasty: str
    full_content: str
    source: str


class ChunkRecord(TypedDict):
    title: str
    author: str
    dynasty: str
    full_content: str
    source: str
    chunk_text: str
    chunk_index: int


# ============================================================
# 工具函数
# ============================================================
def to_simplified(text: str) -> str:
    """繁体转简体"""
    return cc.convert(text)


def clean_text(text: str) -> str:
    """清理文本: 去除多余空白"""
    return re.sub(r'\s+', '', text.strip())


def split_into_couplets(lines: list[str], is_ci: bool = False) -> list[str]:
    """
    把诗词的行列表切分为联/句 (couplets)

    策略:
    - 律诗/绝句: 每两行组成一联 (如 "床前明月光，疑是地上霜。")
    - 词: 按原始分行，每行作为一个 chunk (词的行已经是自然段落)
    - 诗经/楚辞: 按段落分
    """
    if is_ci:
        # 词的每个段落本身就是有意义的单位
        chunks = []
        for line in lines:
            cleaned = clean_text(line)
            if len(cleaned) >= 5:  # 过滤掉太短的
                chunks.append(cleaned)
        return chunks

    # 诗/诗经/楚辞: 两行一联
    chunks = []
    i = 0
    while i < len(lines):
        if i + 1 < len(lines):
            couplet = clean_text(lines[i]) + clean_text(lines[i + 1])
            if len(couplet) >= 5:
                chunks.append(couplet)
            i += 2
        else:
            # 奇数行，单独一句
            cleaned = clean_text(lines[i])
            if len(cleaned) >= 5:
                chunks.append(cleaned)
            i += 1
    return chunks


# ============================================================
# 数据加载函数
# ============================================================
def load_tang300() -> list[PoemRecord]:
    """加载唐诗三百首 (权威选本)"""
    path = os.path.join(REPO_PATH, "全唐诗", "唐诗三百首.json")
    data = json.load(open(path, encoding='utf-8'))
    poems = []
    for item in data:
        title = to_simplified(item.get('title', '无题'))
        author = to_simplified(item.get('author', '佚名'))
        paragraphs = [to_simplified(p) for p in item.get('paragraphs', [])]
        poems.append({
            'title': title,
            'author': author,
            'dynasty': '唐',
            'full_content': ''.join(clean_text(p) for p in paragraphs),
            'source': '唐诗三百首',
        })
    print(f"  唐诗三百首: {len(poems)} 首")
    return poems


def load_song300() -> list[PoemRecord]:
    """加载宋词三百首 (权威选本)"""
    path = os.path.join(REPO_PATH, "宋词", "宋词三百首.json")
    data = json.load(open(path, encoding='utf-8'))
    poems = []
    for item in data:
        title = item.get('rhythmic', '无题')
        author = item.get('author', '佚名')
        paragraphs = item.get('paragraphs', [])
        poems.append({
            'title': title,
            'author': author,
            'dynasty': '宋',
            'full_content': ''.join(clean_text(p) for p in paragraphs),
            'source': '宋词三百首',
        })
    print(f"  宋词三百首: {len(poems)} 首")
    return poems


def load_shijing() -> list[PoemRecord]:
    """加载完整诗经 (305首)"""
    path = os.path.join(REPO_PATH, "诗经", "shijing.json")
    data = json.load(open(path, encoding='utf-8'))
    poems = []
    for item in data:
        title = item.get('title', '无题')
        content_lines = item.get('content', [])
        poems.append({
            'title': title,
            'author': '佚名',
            'dynasty': '先秦',
            'full_content': ''.join(clean_text(c) for c in content_lines),
            'source': '诗经',
        })
    print(f"  诗经: {len(poems)} 首")
    return poems


def load_chuci() -> list[PoemRecord]:
    """加载楚辞"""
    path = os.path.join(REPO_PATH, "楚辞", "chuci.json")
    data = json.load(open(path, encoding='utf-8'))
    poems = []
    for item in data:
        title = item.get('title', '无题')
        author = item.get('author', '佚名')
        content_lines = item.get('content', [])
        poems.append({
            'title': title,
            'author': author,
            'dynasty': '战国',
            'full_content': ''.join(clean_text(c) for c in content_lines),
            'source': '楚辞',
        })
    print(f"  楚辞: {len(poems)} 首")
    return poems


def load_nalan() -> list[PoemRecord]:
    """加载纳兰性德诗集"""
    path = os.path.join(REPO_PATH, "纳兰性德", "纳兰性德诗集.json")
    data = json.load(open(path, encoding='utf-8'))
    poems = []
    for item in data:
        title = item.get('title', '无题')
        author = item.get('author', '纳兰性德')
        paragraphs = item.get('para', item.get('paragraphs', []))
        poems.append({
            'title': title,
            'author': author,
            'dynasty': '清',
            'full_content': ''.join(clean_text(p) for p in paragraphs),
            'source': '纳兰性德',
        })
    print(f"  纳兰性德: {len(poems)} 首")
    return poems


def load_tier1_tang(max_per_poet: int = 80, max_content_len: int = 200) -> list[PoemRecord]:
    """
    从全唐诗中提取 Tier1 诗人的作品 (去重唐诗三百首)

    限制策略:
    - 每位诗人最多取 max_per_poet 首 (避免白居易一人3000首占满)
    - 只取内容 <= max_content_len 字的短诗 (长篇叙事诗不适合取名)
    - 优先取短诗 (绝句/律诗，取名价值更高)
    """
    import glob
    tang_files = sorted(glob.glob(os.path.join(REPO_PATH, "全唐诗", "poet.tang.*.json")))

    # 先按诗人收集，再截取
    by_poet: dict[str, list[PoemRecord]] = {}
    for filepath in tang_files:
        data = json.load(open(filepath, encoding='utf-8'))
        for item in data:
            author = to_simplified(item.get('author', ''))
            if author in TIER1_TANG_POETS:
                title = to_simplified(item.get('title', '无题'))
                paragraphs = [to_simplified(p) for p in item.get('paragraphs', [])]
                content = ''.join(clean_text(p) for p in paragraphs)

                # 过滤: 内容太长的跳过 (长篇叙事诗取名价值低)
                if len(content) > max_content_len:
                    continue

                if author not in by_poet:
                    by_poet[author] = []
                by_poet[author].append({
                    'title': title,
                    'author': author,
                    'dynasty': '唐',
                    'full_content': content,
                    'source': '全唐诗名家',
                })

    # 每位诗人按内容长度排序 (短诗优先)，取前 N 首
    poems = []
    for author in TIER1_TANG_POETS:
        author_poems = by_poet.get(author, [])
        author_poems.sort(key=lambda p: len(p['full_content']))
        selected = author_poems[:max_per_poet]
        poems.extend(selected)
        if selected:
            print(f"    {author}: {len(author_poems)}首 → 取{len(selected)}首")

    print(f"  全唐诗 Tier1 名家: {len(poems)} 首 (上限 {max_per_poet}/人, ≤{max_content_len}字)")
    return poems


def load_tier1_song(max_per_poet: int = 80) -> list[PoemRecord]:
    """从全宋词中提取 Tier1 词人的作品 (去重宋词三百首)"""
    import glob
    song_files = sorted(glob.glob(os.path.join(REPO_PATH, "宋词", "ci.song.*.json")))

    by_poet: dict[str, list[PoemRecord]] = {}
    for filepath in song_files:
        data = json.load(open(filepath, encoding='utf-8'))
        for item in data:
            author = item.get('author', '')
            if author in TIER1_SONG_POETS:
                title = item.get('rhythmic', '无题')
                paragraphs = item.get('paragraphs', [])
                content = ''.join(clean_text(p) for p in paragraphs)

                if author not in by_poet:
                    by_poet[author] = []
                by_poet[author].append({
                    'title': title,
                    'author': author,
                    'dynasty': '宋',
                    'full_content': content,
                    'source': '宋词名家',
                })

    poems = []
    for author in TIER1_SONG_POETS:
        author_poems = by_poet.get(author, [])
        selected = author_poems[:max_per_poet]
        poems.extend(selected)
        if selected:
            print(f"    {author}: {len(author_poems)}首 → 取{len(selected)}首")
    print(f"  宋词 Tier1 名家: {len(poems)} 首")
    return poems


# ============================================================
# 去重
# ============================================================
def deduplicate(poems: list[PoemRecord]) -> list[PoemRecord]:
    """按 title+author 去重，优先保留权威选本的版本"""
    # 权威选本优先级更高
    SOURCE_PRIORITY = {
        '唐诗三百首': 0,
        '宋词三百首': 0,
        '诗经': 0,
        '楚辞': 0,
        '纳兰性德': 1,
        '全唐诗名家': 2,
        '宋词名家': 2,
    }

    seen: dict[str, PoemRecord] = {}
    for poem in poems:
        key = f"{poem['title']}|{poem['author']}"
        if key not in seen:
            seen[key] = poem
        else:
            # 保留优先级更高 (数字更小) 的版本
            existing_priority = SOURCE_PRIORITY.get(seen[key]['source'], 99)
            new_priority = SOURCE_PRIORITY.get(poem['source'], 99)
            if new_priority < existing_priority:
                seen[key] = poem

    result = list(seen.values())
    print(f"\n  去重: {len(poems)} → {len(result)} 首 (去掉 {len(poems) - len(result)} 首重复)")
    return result


# ============================================================
# 切分为 chunks
# ============================================================
def poems_to_chunks(poems: list[PoemRecord]) -> list[ChunkRecord]:
    """把每首诗切分成联/句 chunks"""
    all_chunks: list[ChunkRecord] = []

    for poem in poems:
        # 判断是否为词 (词按行切分，诗按联切分)
        is_ci = poem['source'] in ('宋词三百首', '宋词名家', '纳兰性德')

        # 先把 full_content 按标点拆回行
        # 诗: 以句号(。)分行
        # 词: 以句号(。)或逗号分行不太合适，词的 paragraphs 已经是原始行
        # 所以我们这里直接从原始 paragraphs 切分

        # 由于 full_content 是 join 后的完整文本，我们需要重新按标点切分
        content = poem['full_content']

        if is_ci:
            # 词: 按句号切分为段落，每段作为一个 chunk
            segments = [s.strip() for s in re.split(r'[。]', content) if len(s.strip()) >= 5]
            chunks = segments
        else:
            # 诗/诗经/楚辞: 按句号切分后，两句一联
            sentences = [s.strip() for s in re.split(r'[。]', content) if s.strip()]
            chunks = []
            i = 0
            while i < len(sentences):
                if i + 1 < len(sentences):
                    couplet = sentences[i] + '。' + sentences[i + 1] + '。'
                    chunks.append(couplet)
                    i += 2
                else:
                    chunks.append(sentences[i] + '。')
                    i += 1

        # 过滤太短的 chunks (少于5个字的没什么取名价值)
        chunks = [c for c in chunks if len(re.sub(r'[，。？！、；：\u201c\u201d\u2018\u2019（）\\s]', '', c)) >= 5]

        for idx, chunk_text in enumerate(chunks):
            all_chunks.append({
                'title': poem['title'],
                'author': poem['author'],
                'dynasty': poem['dynasty'],
                'full_content': poem['full_content'],
                'source': poem['source'],
                'chunk_text': chunk_text,
                'chunk_index': idx,
            })

    return all_chunks


# ============================================================
# 主流程
# ============================================================
def main():
    print("=" * 60)
    print("诗词数据处理管线")
    print("=" * 60)

    # 检查数据源是否存在
    if not os.path.exists(REPO_PATH):
        print(f"❌ 数据源不存在: {REPO_PATH}")
        print("   请先运行: git clone --depth 1 https://github.com/chinese-poetry/chinese-poetry.git /tmp/chinese-poetry")
        return

    # Step 1: 加载所有数据源
    print("\n📚 Step 1: 加载数据源...")
    all_poems: list[PoemRecord] = []

    all_poems.extend(load_tang300())        # 权威选本
    all_poems.extend(load_song300())        # 权威选本
    all_poems.extend(load_shijing())        # 完整经典
    all_poems.extend(load_chuci())          # 完整经典
    all_poems.extend(load_nalan())          # 清代名家
    all_poems.extend(load_tier1_tang())     # 唐代名家扩展
    all_poems.extend(load_tier1_song())     # 宋代名家扩展

    print(f"\n  总计加载: {len(all_poems)} 首")

    # Step 2: 去重
    print("\n🔄 Step 2: 去重...")
    poems = deduplicate(all_poems)

    # Step 3: 过滤掉内容太短的诗 (少于10个字)
    poems = [p for p in poems if len(p['full_content']) >= 10]
    print(f"  过滤后: {len(poems)} 首")

    # Step 4: 切分为 chunks
    print("\n✂️  Step 3: 按联/句切分...")
    chunks = poems_to_chunks(poems)
    print(f"  生成 chunks: {len(chunks)} 条")

    # 统计
    print("\n📊 统计:")
    source_stats: dict[str, int] = {}
    for c in chunks:
        source_stats[c['source']] = source_stats.get(c['source'], 0) + 1
    for source, count in sorted(source_stats.items(), key=lambda x: -x[1]):
        print(f"  {source}: {count} chunks")

    # 展示几个样本
    print("\n📝 样本 chunks:")
    import random
    samples = random.sample(chunks, min(5, len(chunks)))
    for s in samples:
        print(f"  [{s['source']}] {s['author']}《{s['title']}》: {s['chunk_text'][:50]}")

    # Step 5: 输出 JSON
    output_path = os.path.join(os.path.dirname(__file__), "poem-chunks.json")

    # 每首诗按数组下标 (poem_index) 做唯一标识，不用 "title|author"
    # 因为同一诗人可能有多首同名作品 (如苏轼多首《浣溪沙》)
    poems_output = []
    for p in poems:
        poems_output.append({
            'title': p['title'],
            'author': p['author'],
            'dynasty': p['dynasty'],
            'full_content': p['full_content'],
            'source': p['source'],
        })

    # 为 chunks 建立 poem_index 映射
    # 用 id(poem) 来关联 chunk 和 poems 列表中的下标
    poem_obj_to_index: dict[int, int] = {id(p): i for i, p in enumerate(poems)}

    chunks_output = []
    for c in chunks:
        # chunks 里的数据来自 poems_to_chunks，它遍历 poems 列表
        # 我们需要通过 full_content 精确匹配找到对应的 poem_index
        pass  # 下面重构

    # 重新切分，这次带上 poem_index
    chunks_output = []
    for poem_index, poem in enumerate(poems):
        is_ci = poem['source'] in ('宋词三百首', '宋词名家', '纳兰性德')
        content = poem['full_content']

        if is_ci:
            segments = [s.strip() for s in re.split(r'[。]', content) if len(s.strip()) >= 5]
            chunk_texts = segments
        else:
            sentences = [s.strip() for s in re.split(r'[。]', content) if s.strip()]
            chunk_texts = []
            i = 0
            while i < len(sentences):
                if i + 1 < len(sentences):
                    couplet = sentences[i] + '。' + sentences[i + 1] + '。'
                    chunk_texts.append(couplet)
                    i += 2
                else:
                    chunk_texts.append(sentences[i] + '。')
                    i += 1

        chunk_texts = [c for c in chunk_texts if len(re.sub(r'[，。？！、；：\u201c\u201d\u2018\u2019（）\\s]', '', c)) >= 5]

        for chunk_idx, chunk_text in enumerate(chunk_texts):
            chunks_output.append({
                'poem_index': poem_index,
                'chunk_text': chunk_text,
                'chunk_index': chunk_idx,
            })

    output = {
        'poems': poems_output,
        'chunks': chunks_output,
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    file_size = os.path.getsize(output_path) / 1024 / 1024
    print(f"\n✅ 输出: {output_path}")
    print(f"   {len(poems_output)} 首诗, {len(chunks_output)} 条 chunks, {file_size:.2f}MB")
    print("\n🎯 下一步: 运行 seed-supabase.ts 生成 embedding 并写入 Supabase")


if __name__ == '__main__':
    main()
