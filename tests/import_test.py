import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from import_book import extract_variant,convert,SOURCE
from bs4 import BeautifulSoup
from block_ids import assign_blocks

class ImportTests(unittest.TestCase):
    def test_stable_blocks_survive_insertions_and_repeat_import(self):
        registry={}
        first,aliases,_=assign_blocks('<h1 data-block="b0">标题</h1><p data-block="b1">原文</p>','section',registry)
        old_id=aliases['b1']
        second,_,_=assign_blocks('<h1>标题</h1><p>新增段落</p><p>原文</p>','section',registry)
        self.assertEqual(BeautifulSoup(second,'html.parser').find_all('p')[-1]['data-block'],old_id)
        third,_,changes=assign_blocks('<h1>标题</h1><p>新增段落</p><p>原文</p>','section',registry)
        self.assertEqual(second,third)
        self.assertEqual(changes,[])
        self.assertEqual(registry['section']['aliases']['b1'],old_id)
    def test_fenced_code_is_environment_independent_and_preserves_text(self):
        for language,code in [('shell','docker-compose up -d'),('python','if a < 3:\n    print("<tag>")')]:
            with self.subTest(language=language):
                rendered,_,_=convert(f'```{language}\n{code}\n```',pathlib.Path('chapter_appendix/contribution.md'),'test')
                soup=BeautifulSoup(rendered,'html.parser')
                self.assertEqual(soup.pre.code.get_text().rstrip('\n'),code)
                self.assertIsNone(soup.pre.find('span'))

    def test_same_named_methods_keep_class_scope(self):
        for language,suffix in [('python','py'),('java','java'),('ruby','rb'),('go','go'),('rust','rs'),('c','c'),('swift','swift'),('kotlin','kt')]:
            with self.subTest(language=language):
                text=(SOURCE/f'codes/{language}/chapter_sorting/quick_sort.{suffix}').read_text(encoding='utf8')
                snippet,_=extract_variant(text,'quick_sort_median','partition',language,'quick_sort')
                self.assertIn('median',snippet.lower())
                self.assertIn(snippet,text)

    def test_missing_symbol_is_an_error(self):
        with self.assertRaises(ValueError):extract_variant('def sample():\n    pass','','missing','python','sample')
        with self.assertRaises(ValueError):extract_variant('int sample() { return 1; }','','missing','c','sample')

    def test_braces_inside_strings_and_comments_do_not_truncate_code(self):
        source='int sample() {\n // }\n const char *s = "}";\n return 1;\n}'
        snippet,_=extract_variant(source,'','sample','c','sample')
        self.assertEqual(snippet,source)

if __name__=='__main__':unittest.main()
