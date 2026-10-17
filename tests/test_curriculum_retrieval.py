import sys
import os
import types
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from modules.tutor import model_reply, make_plan
from modules.curricula import LESSONS

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
        with patch.dict(sys.modules,modules), patch.dict(os.environ,{'GROQ_API_KEY':'fictional-test-key'}):
            result=model_reply('quadratics','secondary','guide',{'id':'cam-igcse-extended','exam_year':2027,'subject':'mathematics','safety_notice':'TEST: paper only'},'quadratic')
        self.assertEqual(result,'A checked response')
        self.assertEqual(vectorstore.similarity_search.call_count,1)
        self.assertEqual(vectorstore.similarity_search.call_args.kwargs['filter'],{'$and':[{'course_id':'cam-igcse-extended'},{'exam_year':2027},{'topic_id':'quadratic'}]})
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
