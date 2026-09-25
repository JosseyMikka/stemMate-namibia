# Runs all-MiniLM-L12-v2 through ONNX Runtime instead of sentence-transformers,
# so the server doesn't need PyTorch and fits in a small (512 MB) instance.
# Produces the same normalized vectors as the stored chroma_store.
import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download
from langchain_core.embeddings import Embeddings
from tokenizers import Tokenizer

MODEL_REPO = "sentence-transformers/all-MiniLM-L12-v2"
MAX_TOKENS = 128  # the model's max_seq_length
BATCH_SIZE = 32


class MiniLMOnnxEmbeddings(Embeddings):
    def __init__(self):
        self.tokenizer = Tokenizer.from_file(hf_hub_download(MODEL_REPO, "tokenizer.json"))
        self.tokenizer.enable_truncation(max_length=MAX_TOKENS)
        self.tokenizer.enable_padding()
        self.session = ort.InferenceSession(
            hf_hub_download(MODEL_REPO, "onnx/model.onnx"),
            providers=["CPUExecutionProvider"],
        )
        self.input_names = {i.name for i in self.session.get_inputs()}

    def _embed(self, texts):
        encoded = self.tokenizer.encode_batch(texts)
        ids = np.array([e.ids for e in encoded], dtype=np.int64)
        mask = np.array([e.attention_mask for e in encoded], dtype=np.int64)
        inputs = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in self.input_names:
            inputs["token_type_ids"] = np.zeros_like(ids)
        tokens = self.session.run(None, inputs)[0]

        # Mean pooling over real (non-padding) tokens, then L2-normalize
        m = mask[..., None].astype(np.float32)
        vecs = (tokens * m).sum(axis=1) / np.clip(m.sum(axis=1), 1e-9, None)
        vecs = vecs / np.linalg.norm(vecs, axis=1, keepdims=True)
        return vecs.tolist()

    def embed_documents(self, texts):
        return [v for i in range(0, len(texts), BATCH_SIZE) for v in self._embed(texts[i:i + BATCH_SIZE])]

    def embed_query(self, text):
        return self._embed([text])[0]


embeddings = MiniLMOnnxEmbeddings()
