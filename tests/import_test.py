import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from import_book import extract_variant,convert,SOURCE
from bs4 import BeautifulSoup
from block_ids import assign_blocks

class ImportTests(unittest.TestCase):
    def test_teammate_labs_keep_routes_ids_and_are_repeatable(self):
        import route_lab
        registry={}
        pages=list(route_lab.pages())
        self.assertEqual(len(pages),6)
        self.assertEqual(sum(len(examples)-1 for _,_,examples in pages),15)
        for original,body,examples in pages:
            route_lab.seed_registry(original,registry)
            first,aliases,_=assign_blocks(body,original['id'],registry)
            second,_,changes=assign_blocks(body,original['id'],registry)
            self.assertEqual(first,second);self.assertEqual(changes,[])
            self.assertEqual(set(original['blockAliases'].values()),set(aliases.values()))
            soup=BeautifulSoup(first,'html.parser')
            self.assertFalse(soup.select('textarea,.lab-editor,[data-action="lab-run"]'))
            for button in soup.select('[data-action="code"]'):
                self.assertLess(int(button['data-code']),len(examples))
            for example in examples:
                self.assertEqual(example['variants'][0]['sourceOrigin'],'authored')

    def test_route_lab_reference_and_basic_cards_run_in_fresh_namespaces(self):
        import route_lab,contextlib,io
        scope={'__name__':'test'};exec(route_lab.reference(),scope)
        graph=scope['build_adj_list'](3,[[0,1]])
        self.assertEqual(scope['bfs_shortest'](graph,0),[0,1,-1])
        self.assertEqual(scope['build_adj_matrix'](0,[]),[])
        self.assertEqual(scope['bubble_sort_desc']([3,1,3]),[3,3,1])
        self.assertEqual(scope['binary_search']([],3),-1)
        self.assertEqual(scope['binary_search']([1,3,5],5),2)
        self.assertEqual(scope['dispatch_plan'](),[0,4,2,7,5,1,6,3])
        for original,body,examples in route_lab.pages():
            soup=BeautifulSoup(body,'html.parser')
            for card in soup.select('.route-lab-card'):
                if card.get('data-level','basic')!='basic':continue
                code=examples[int(card.button['data-code'])]['variants'][0]['fullSource']
                with contextlib.redirect_stdout(io.StringIO()) as output:
                    exec(code,{'__name__':'__main__'})
                self.assertTrue(output.getvalue().strip(),card['data-lab-key'])

    def test_chapter12_overlay_preserves_unchanged_ids_and_repeated_import(self):
        import chapter12
        section=chapter12.PREFIX+'divide_and_conquer'
        original='<h1>分治算法</h1><p>原文递归解释</p>'
        registry={}
        _,aliases,_=assign_blocks(original,section,registry)
        original_id=aliases['b1']
        enhanced=chapter12.overlay(original,section)
        first,_,_=assign_blocks(enhanced,section,registry)
        second,_,changes=assign_blocks(chapter12.overlay(original,section),section,registry)
        self.assertEqual(first,second);self.assertEqual(changes,[])
        self.assertEqual(BeautifulSoup(first,'html.parser').find('p',string='原文递归解释')['data-block'],original_id)
        chapter12.SEEN.clear();decorated=chapter12.terms(first,section)
        self.assertEqual(BeautifulSoup(decorated,'html.parser').get_text(),BeautifulSoup(first,'html.parser').get_text())
        chapter12.SEEN.clear()

    def test_chapter12_solutions_and_typical_wrong_answers(self):
        from chapter12_tasks import TASKS
        wrong={
            'ch12-merge':'def solve(a,b): return sorted(set(a+b))',
            'ch12-search':'def solve(a,t): return a[:-1].index(t) if t in a[:-1] else -1',
            'ch12-tree':'def solve(p,i): return [p[0],None,None] if p else None',
            'ch12-hanoi':'def solve(n): return [["A","C"]]*n',
            'ch12-power':'def solve(x,n): return x**n if n else 0'}
        for task in TASKS:
            with self.subTest(task=task['id']):
                good={'__name__':'exercise'};bad={}
                exec(task['solution'],good);exec(wrong[task['id']],bad)
                self.assertTrue(all(good['solve'](*case['args'])==case['expected'] for case in task['tests']))
                self.assertTrue(any(bad['solve'](*case['args'])!=case['expected'] for case in task['tests']))
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
        wrapped,_,_=assign_blocks(f'<h1>标题</h1><details data-preserve-block="{old_id}"><summary>展开对照</summary><p>原文</p></details>','section',registry)
        self.assertEqual(BeautifulSoup(wrapped,'html.parser').details['data-block'],old_id)
        self.assertNotIn('data-preserve-block',wrapped)
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
