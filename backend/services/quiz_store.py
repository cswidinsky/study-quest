import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import UUID


class QuizStoreError(Exception):
    """Supabase is unavailable or returned an unexpected response."""

    def __init__(self, status=None):
        super().__init__("Quiz storage is temporarily unavailable.")
        self.status = status


class InvalidSessionError(Exception):
    """Supabase could not authenticate this user's access token."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # API credentials are scoped to the configured Supabase origin.
        return None


class QuizStore:
    RESULT_FIELDS = "answers,score,total,results"

    def __init__(self, url, publishable_key, secret_key):
        self.url = url
        self.publishable_key = publishable_key
        self.database_headers = {"apikey": secret_key}
        if not secret_key.startswith("sb_secret_"):
            # The legacy service-role key is itself a JWT.
            self.database_headers["Authorization"] = f"Bearer {secret_key}"
        self.http = build_opener(NoRedirect())

    @classmethod
    def from_environment(cls):
        url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
        publishable_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "").strip()
        secret_key = os.environ.get("SUPABASE_SECRET_KEY", "").strip()
        if not url.startswith("https://") or not publishable_key or not secret_key:
            raise QuizStoreError()
        return cls(url, publishable_key, secret_key)

    def _request(self, path, *, headers, query=None, data=None):
        url = f"{self.url}{path}"
        if query:
            url += f"?{urlencode(query)}"
        request = Request(url, headers={"Accept": "application/json", **headers})
        if data is not None:
            request.data = json.dumps(data).encode("utf-8")
            request.add_header("Content-Type", "application/json")

        try:
            with self.http.open(request, timeout=10) as response:
                body = response.read()
            return json.loads(body) if body else None
        except HTTPError as error:
            error.close()
            raise QuizStoreError(error.code) from None
        except (URLError, OSError, ValueError):
            raise QuizStoreError() from None

    def authenticate(self, token):
        try:
            user = self._request("/auth/v1/user", headers={
                "apikey": self.publishable_key,
                "Authorization": f"Bearer {token}",
            })
        except QuizStoreError as error:
            if error.status in (401, 403):
                raise InvalidSessionError() from None
            raise

        user_id = user.get("id") if isinstance(user, dict) else None
        if not isinstance(user_id, str):
            raise QuizStoreError()
        try:
            return str(UUID(user_id))
        except ValueError:
            raise QuizStoreError() from None

    def create_quiz(self, quiz_id, owner_id, questions):
        self._request("/rest/v1/quizzes", headers={
            **self.database_headers,
            "Prefer": "return=minimal",
        }, data={"id": quiz_id, "owner_id": owner_id, "questions": questions})

    def _find(self, table, id_column, quiz_id, owner_id, fields):
        try:
            quiz_id = str(UUID(quiz_id))
        except ValueError:
            return None

        rows = self._request(f"/rest/v1/{table}", headers=self.database_headers, query={
            id_column: f"eq.{quiz_id}",
            "owner_id": f"eq.{owner_id}",
            "select": fields,
            "limit": 1,
        })
        if not isinstance(rows, list):
            raise QuizStoreError()
        return rows[0] if rows else None

    def get_quiz(self, quiz_id, owner_id):
        row = self._find("quizzes", "id", quiz_id, owner_id, "questions")
        return row["questions"] if row else None

    def get_result(self, quiz_id, owner_id):
        return self._find("quiz_attempts", "quiz_id", quiz_id, owner_id, self.RESULT_FIELDS)

    def save_result(self, quiz_id, owner_id, result):
        rows = self._request("/rest/v1/quiz_attempts", headers={
            **self.database_headers,
            "Prefer": "resolution=ignore-duplicates,return=representation",
        }, query={"select": self.RESULT_FIELDS}, data={
            "quiz_id": str(UUID(quiz_id)),
            "owner_id": owner_id,
            **result,
        })
        if not isinstance(rows, list):
            raise QuizStoreError()
        if rows:
            return rows[0]

        saved = self.get_result(quiz_id, owner_id)
        if saved is None:
            raise QuizStoreError()
        return saved
