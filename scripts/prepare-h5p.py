"""Build the original PLEX exercise and vendor its exact H5P runtime dependencies."""
import hashlib, io, json, pathlib, shutil, uuid, zipfile
import requests
ROOT=pathlib.Path(__file__).resolve().parents[1]
LIBS=ROOT/'content/h5p/libraries'
DEST=ROOT/'content/h5p/binary-search'
if not (LIBS/'H5P.InteractiveBook-1.11').exists() and (DEST/'H5P.InteractiveBook-1.11').exists():
    LIBS=DEST
def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def read(path): return json.loads(path.read_text(encoding='utf8'))
if not (LIBS/'H5P.InteractiveBook-1.11').exists():
    response=requests.get('https://api.h5p.org/v1/content-types/H5P.InteractiveBook',timeout=90);response.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        LIBS.mkdir(parents=True,exist_ok=True)
        assert all((LIBS/name).resolve().is_relative_to(LIBS.resolve()) for name in archive.namelist())
        archive.extractall(LIBS)

def defaults(fields):
    result={}
    for field in fields:
        if 'default' in field: result[field['name']]=field['default']
        elif field['type']=='group': result[field['name']]=defaults(field.get('fields',[]))
    return result
def parameters(lib): return defaults(read(LIBS/lib/'semantics.json'))
def sub(lib, title, params, identity):
    return {'library':lib,'metadata':{'title':title,'contentType':lib.split()[0].replace('H5P.',''),'license':'CC BY-NC-SA','licenseVersion':'4.0','authors':[{'name':'PLEX 数字教材编者','role':'Author'}]},'params':params,'subContentId':str(uuid.uuid5(uuid.NAMESPACE_URL,'plex/'+identity))}

questions=[
 ('二分查找的前提','二分查找要求待查找的数组具备什么条件？',['元素已经有序排列','元素必须全部为正数','数组长度必须是偶数'],0,'二分查找通过有序关系排除一半范围；正负数与奇偶长度不影响这一前提。'),
 ('下一步搜索范围','数组 [1, 3, 6, 8, 12, 15, 23] 中查找 12，首次中点是 8。下一步应搜索哪部分？',['[1, 3, 6]','[12, 15, 23]','整个数组重新开始'],1,'12 大于中点值 8，因此可以排除左半部分和中点，继续搜索右半部分。'),
 ('时间复杂度','每轮把搜索范围缩小一半，二分查找的时间复杂度是？',['O(n²)','O(n)','O(log n)'],2,'最多经过对数数量的折半，搜索区间就会缩小至一个元素。')
]
chapters=[]
intro=sub('H5P.AdvancedText 1.1','概念回顾',{'text':'<h2>二分查找 · 星轨试炼</h2><p>在有序数组中比较中间元素，每次排除一半搜索范围。完成三个小任务，看看你是否掌握了这一思路。</p>'},'intro')
for i,(title,question,answers,correct,explanation) in enumerate(questions):
    params=parameters('H5P.MultiChoice-1.16')
    params['question']='<p>'+question+'</p>'
    params['answers']=[{'text':'<p>'+answer+'</p>','correct':j==correct,'tipsAndFeedback':{'tip':'','chosenFeedback':explanation,'notChosenFeedback':''}} for j,answer in enumerate(answers)]
    params['overallFeedback']=[{'from':0,'to':99,'feedback':'再想一想。'+explanation},{'from':100,'to':100,'feedback':'回答正确！'+explanation}]
    params['behaviour'].update({'enableRetry':True,'enableSolutionsButton':True,'singleAnswer':True,'randomAnswers':False,'type':'single'})
    params['UI'].update({'checkAnswerButton':'检查答案','submitAnswerButton':'提交','showSolutionButton':'查看答案','tryAgainButton':'重试','scoreBarLabel':'得分 :num / :total','a11yCheck':'检查答案','a11yShowSolution':'查看正确答案','a11yRetry':'重新作答'})
    activity=sub('H5P.MultiChoice 1.16',title,params,'question-'+str(i))
    items=[{'content':activity,'useSeparator':'auto'}]
    if i==0: items.insert(0,{'content':intro,'useSeparator':'auto'})
    chapters.append(sub('H5P.Column 1.18',title,{'content':items},'chapter-'+str(i)))
book=parameters('H5P.InteractiveBook-1.11')
book.update({'showCoverPage':False,'chapters':chapters,'nextPage':'下一页','previousPage':'上一页','displayTOC':'显示目录','hideTOC':'隐藏目录','read':'开始','markAsFinished':'本页已完成','chapterCompleted':'本页已完成','submitReport':'完成练习','restartLabel':'重新开始','summaryHeader':'练习总结','summaryAndSubmit':'总结','score':'得分','totalScoreLabel':'总分','allInteractions':'全部题目','unansweredInteractions':'未答题目','bookProgress':'阅读进度','interactionsProgress':'答题进度','yourAnswersAreSubmittedForReview':'练习已完成，结果已保存到本机。'})
book['behaviour'].update({'baseColor':'#4f8d86','defaultTableOfContents':False,'progressIndicators':True,'progressAuto':True,'displaySummary':True,'enableRetry':True})
book.update({'partCompleted':'已完成 @pages / @total','incompleteChapter':'本页未完成','navigateToTop':'返回顶部','fullscreen':'全屏','exitFullscreen':'退出全屏','bookProgressSubtext':'@count / @total 页','interactionsProgressSubtext':'@count / @total 题','leftOutOfTotalCompleted':'已完成 @left / @max 题','noInteractions':'没有互动题目','noChapterInteractionBoldText':'你还没有开始答题。','noChapterInteractionText':'完成至少一道题目后即可查看总结。','a11y':{'progress':'第 @page 页，共 @total 页。','menu':'切换章节目录'}})
required={}
def include(name):
    if name in required:return
    lib=read(LIBS/name/'library.json');required[name]=lib
    for dependency in lib.get('preloadedDependencies',[])+lib.get('dynamicDependencies',[]):
        include(f"{dependency['machineName']}-{dependency['majorVersion']}.{dependency['minorVersion']}")
for name in ['H5P.InteractiveBook-1.11','H5P.Column-1.18','H5P.AdvancedText-1.1','H5P.MultiChoice-1.16']: include(name)
for name in required:
    if LIBS!=DEST:shutil.copytree(LIBS/name,DEST/name,dirs_exist_ok=True)
deps=[{k:lib[k] for k in ['machineName','majorVersion','minorVersion']} for lib in required.values()]
write(DEST/'content/content.json',book)
write(DEST/'h5p.json',{'title':'二分查找 · 星轨试炼','language':'zh-hans','mainLibrary':'H5P.InteractiveBook','embedTypes':['iframe'],'license':'CC BY-NC-SA','licenseVersion':'4.0','preloadedDependencies':deps})
write(ROOT/'content/h5p/runtime-lock.json',{'source':'https://api.h5p.org/v1/content-types/H5P.InteractiveBook','libraries':{name:{'version':f"{v['majorVersion']}.{v['minorVersion']}.{v['patchVersion']}",'sha256':hashlib.sha256((DEST/name/'library.json').read_bytes()).hexdigest(),'files':{p.relative_to(DEST/name).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((DEST/name).rglob('*')) if p.is_file()}} for name,v in required.items()}})
print(f'Built three questions with {len(required)} pinned H5P libraries')
