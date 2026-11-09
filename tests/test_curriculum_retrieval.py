import sys
import os
import types
import tempfile
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import json
from modules.tutor import model_reply, make_plan, reviewed_context
from modules.curricula import LESSONS, PACK_VERSION, catalogue, course_for, starter_plan
from fastapi import HTTPException

class RetrievalTests(unittest.TestCase):
    def test_unlabelled_documents_are_not_used_as_cross_curriculum_fallback(self):
        model=MagicMock();model.invoke.return_value=types.SimpleNamespace(content='A checked response')
        vectorstore=MagicMock();vectorstore.similarity_search.return_value=[]
        groq=types.ModuleType('langchain_groq');groq.ChatGroq=MagicMock(return_value=model)
        community=types.ModuleType('langchain_community');community.__path__=[]
        vectors=types.ModuleType('langchain_community.vectorstores');vectors.Chroma=MagicMock(return_value=vectorstore)
        embeddings=types.ModuleType('modules.embeddings');embeddings.embeddings=object()
        loader=types.ModuleType('modules.load_vectorstore');loader.PERSIST_DIR='/test-only'
        modules={'langchain_groq':groq,'langchain_community':community,'langchain_community.vectorstores':vectors,'modules.embeddings':embeddings,'modules.load_vectorstore':loader}
        with tempfile.TemporaryDirectory() as directory, patch.dict(sys.modules,modules), patch.dict(os.environ,{'GROQ_API_KEY':'fictional-test-key','STEMMATE_VECTORSTORE_DIR':directory}):
            Path(directory,'chroma.sqlite3').touch()
            result=model_reply('quadratics','secondary','guide',{'id':'cam-igcse-extended','exam_year':2027,'pack_id':'cam-igcse-extended','pack_version':PACK_VERSION,'subject':'mathematics','safety_notice':'TEST: paper only'},'quadratic')
        self.assertEqual(result,'A checked response')
        self.assertEqual(vectorstore.similarity_search.call_count,1)
        self.assertEqual(vectorstore.similarity_search.call_args.kwargs['filter'],{'$and':[{'course_id':'cam-igcse-extended'},{'pack_id':'cam-igcse-extended'},{'pack_version':PACK_VERSION},{'exam_year':2027},{'topic_id':'quadratic'},{'approval_status':'reviewed'},{'access_scope':'public_curriculum'}]})
        messages=model.invoke.call_args.args[0]
        self.assertIn('requiring teacher review',messages[0][1])
        self.assertIn('TEST: paper only',messages[0][1])
        self.assertIn('selected class subject',messages[0][1])
        self.assertNotIn('selected Mathematics topic',messages[0][1])
        self.assertIn('"curriculum_excerpts": ""',messages[1][1])

    def test_invalid_ai_structure_is_rejected(self):
        import json
        for invalid in ({**LESSONS['linear'],'hints':['answer']}, {**LESSONS['linear'],'independent':LESSONS['linear']['application']}):
            with patch('modules.tutor.model_reply',return_value=json.dumps(invalid)):
                with self.assertRaises(ValueError):make_plan('math','secondary')

    def test_missing_provider_fails_before_loading_external_models(self):
        with patch.dict(os.environ,{'GROQ_API_KEY':''}):
            with self.assertRaisesRegex(ValueError,'not configured'):
                model_reply('linear equations','secondary','guide')

    def test_missing_index_does_not_load_embeddings_or_claim_reviewed_material(self):
        from modules.tutor import reviewed_context
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ,{'STEMMATE_VECTORSTORE_DIR':directory}):
            self.assertEqual(reviewed_context('equations',{'id':'na-nssco','exam_year':2027},'linear'),'')

    def test_results_are_revalidated_even_if_store_ignores_filter(self):
        from modules.tutor import reviewed_context
        course={**course_for('na-nssco',10,2027),'exam_year':2027}
        metadata={'course_id':'na-nssco','pack_id':'na-nssco','pack_version':PACK_VERSION,
                  'exam_year':2027,'topic_id':'linear','approval_status':'reviewed',
                  'access_scope':'public_curriculum','source_id':'fixture-1','source_version':'v1',
                  'source_title':'Synthetic test source','source_locator':'page 1'}
        good=types.SimpleNamespace(page_content='ALLOWED_FIXTURE',metadata=metadata)
        bad=[]
        for key,value in [('course_id','cam-igcse-core'),('pack_id','cam-igcse-core'),
                          ('pack_version','old'),('exam_year',2026),('topic_id','quadratic'),
                          ('approval_status','draft'),('access_scope','private_class'),('source_id','')]:
            bad.append(types.SimpleNamespace(page_content='FORBIDDEN_FIXTURE',metadata={**metadata,key:value}))
        bad.append(types.SimpleNamespace(page_content='FORBIDDEN_FIXTURE',metadata={}))
        vectorstore=MagicMock();vectorstore.similarity_search.return_value=[good,*bad]
        vectors=types.ModuleType('langchain_community.vectorstores');vectors.Chroma=MagicMock(return_value=vectorstore)
        community=types.ModuleType('langchain_community');community.__path__=[]
        embeddings=types.ModuleType('modules.embeddings');embeddings.embeddings=object()
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ,{'STEMMATE_VECTORSTORE_DIR':directory}), patch.dict(sys.modules,{'langchain_community':community,'langchain_community.vectorstores':vectors,'modules.embeddings':embeddings}):
            Path(directory,'chroma.sqlite3').touch()
            context=reviewed_context('same question',course,'linear')
            self.assertIn('ALLOWED_FIXTURE',context)
            self.assertNotIn('FORBIDDEN_FIXTURE',context)
            self.assertIn('page 1',context)
            vectorstore.similarity_search.assert_called_once()
            vectorstore.similarity_search.reset_mock()
            self.assertEqual(reviewed_context('same question',{'id':'na-nssco'},'linear'),'')
            vectorstore.similarity_search.assert_not_called()

    def test_registry_rejects_unknown_version_and_returns_independent_copies(self):
        from fastapi import HTTPException
        a=course_for('na-nssco',10,2027,PACK_VERSION)
        a['topics'].clear()
        self.assertTrue(course_for('na-nssco',10,2027,PACK_VERSION)['topics'])
        with self.assertRaises(HTTPException):course_for('na-nssco',10,2027,'invented-version')

    def test_biology_and_computing_starters_cannot_cross_subjects(self):
        courses=catalogue()
        biology=[c for c in courses if c['subject']=='biology']
        computing=[c for c in courses if c['subject']=='computing']
        self.assertEqual({c['pathway'] for c in biology},{'Namibia','Cambridge'})
        self.assertEqual({c['pathway'] for c in computing},{'Namibia','Cambridge'})
        bio_topics={t['id'] for c in biology for t in c['topics']}
        cs_topics={t['id'] for c in computing for t in c['topics']}
        self.assertFalse(bio_topics & cs_topics)
        for selected,foreign in ((biology,cs_topics),(computing,bio_topics)):
            for course in selected:
                for topic in course['topics']:
                    self.assertEqual(starter_plan(course,topic['id']),LESSONS[topic['id']])
                for topic_id in foreign:
                    with self.subTest(course=course['id'],foreign_topic=topic_id),self.assertRaises(HTTPException) as caught:
                        starter_plan(course,topic_id)
                    self.assertEqual(caught.exception.status_code,422)

    # --- Reconciliation guards (PR #2 x PR #3): keep reviewed-pack retrieval strict. ---
    def _store_modules(self, docs):
        vectorstore=MagicMock();vectorstore.similarity_search.return_value=docs
        chroma=MagicMock(return_value=vectorstore)
        vectors=types.ModuleType('langchain_community.vectorstores');vectors.Chroma=chroma
        community=types.ModuleType('langchain_community');community.__path__=[]
        embeddings=types.ModuleType('modules.embeddings');embeddings.embeddings=object()
        return vectorstore,chroma,{'langchain_community':community,'langchain_community.vectorstores':vectors,'modules.embeddings':embeddings}

    def _metadata(self, **changes):
        return {'course_id':'na-nssco','pack_id':'na-nssco','pack_version':PACK_VERSION,'exam_year':2027,
                'topic_id':'linear','approval_status':'reviewed','access_scope':'public_curriculum',
                'source_id':'fixture-1','source_version':'v1','source_title':'Synthetic test source',
                'source_locator':'page 1',**changes}

    def test_teacher_preparation_path_never_queries_reviewed_store(self):
        """teacher_planning calls model_reply(..., topic_id=None); that must not open the index."""
        vectorstore,chroma,modules=self._store_modules([types.SimpleNamespace(page_content='FORBIDDEN_FIXTURE',metadata=self._metadata())])
        model=MagicMock();model.invoke.return_value.content='draft'
        groq=types.ModuleType('langchain_groq');groq.ChatGroq=MagicMock(return_value=model)
        course={**course_for('na-nssco',10,2027),'exam_year':2027}
        with tempfile.TemporaryDirectory() as directory, patch.dict(sys.modules,{**modules,'langchain_groq':groq}), patch.dict(os.environ,{'GROQ_API_KEY':'fictional-test-key','STEMMATE_VECTORSTORE_DIR':directory}):
            Path(directory,'chroma.sqlite3').touch()
            model_reply('teacher payload','secondary','draft',course,None)
        chroma.assert_not_called();vectorstore.similarity_search.assert_not_called()
        human=json.loads(model.invoke.call_args.args[0][1][1])
        self.assertEqual(human['curriculum_excerpts'],'')
        self.assertNotIn('FORBIDDEN_FIXTURE',repr(model.invoke.call_args))

    def test_retrieval_requires_pack_identity_and_version(self):
        vectorstore,chroma,modules=self._store_modules([])
        base={**course_for('na-nssco',10,2027),'exam_year':2027}
        with tempfile.TemporaryDirectory() as directory, patch.dict(sys.modules,modules), patch.dict(os.environ,{'STEMMATE_VECTORSTORE_DIR':directory}):
            Path(directory,'chroma.sqlite3').touch()
            for missing in ('pack_id','pack_version'):
                with self.subTest(missing=missing):
                    course={k:v for k,v in base.items() if k!=missing}
                    self.assertEqual(reviewed_context('q',course,'linear'),'')
                    self.assertEqual(reviewed_context('q',{**base,missing:''},'linear'),'')
        chroma.assert_not_called()

    def test_provenance_must_be_bounded_non_empty_strings(self):
        good=types.SimpleNamespace(page_content='ALLOWED_FIXTURE',metadata=self._metadata())
        bad=[types.SimpleNamespace(page_content='FORBIDDEN_FIXTURE',metadata=self._metadata(**{key:value}))
             for key in ('source_id','source_version','source_title','source_locator')
             for value in ('   ',None,7,'x'*129)]
        vectorstore,chroma,modules=self._store_modules([*bad,good])
        course={**course_for('na-nssco',10,2027),'exam_year':2027}
        with tempfile.TemporaryDirectory() as directory, patch.dict(sys.modules,modules), patch.dict(os.environ,{'STEMMATE_VECTORSTORE_DIR':directory}):
            Path(directory,'chroma.sqlite3').touch()
            approved=json.loads(reviewed_context('q',course,'linear'))
        self.assertEqual(len(approved),1)
        self.assertEqual(approved[0],{'source_id':'fixture-1','source_version':'v1','title':'Synthetic test source','locator':'page 1','excerpt':'ALLOWED_FIXTURE'})
        clauses=vectorstore.similarity_search.call_args.kwargs['filter']['$and']
        self.assertEqual({key for clause in clauses for key in clause},{'course_id','pack_id','pack_version','exam_year','topic_id','approval_status','access_scope'})

    def test_only_unreviewed_results_yield_no_context(self):
        docs=[types.SimpleNamespace(page_content='FORBIDDEN_FIXTURE',metadata=self._metadata(approval_status='draft')),
              types.SimpleNamespace(page_content='FORBIDDEN_FIXTURE',metadata=self._metadata(pack_version='superseded'))]
        vectorstore,chroma,modules=self._store_modules(docs)
        course={**course_for('na-nssco',10,2027),'exam_year':2027}
        with tempfile.TemporaryDirectory() as directory, patch.dict(sys.modules,modules), patch.dict(os.environ,{'STEMMATE_VECTORSTORE_DIR':directory}):
            Path(directory,'chroma.sqlite3').touch()
            self.assertEqual(reviewed_context('q',course,'linear'),'')

