import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from import_book import extract_variant,SOURCE

class ImportTests(unittest.TestCase):
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
