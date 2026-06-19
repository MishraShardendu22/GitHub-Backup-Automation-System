### High-Level Flow

```text
Frontend
   |
   | POST /chat/stream
   v
FastAPI Endpoint
   |
   v
event_generator()
   |
   | async for event in stream_agent()
   v
LLM / OpenRouter
   |
   | token
   | token
   | token
   v
yield "data: ...\n\n"
   |
   v
StreamingResponse
   |
   v
Browser
   |
   v
UI Updates Incrementally
```

---

### Key Concepts

#### 1. Client opens a long-lived HTTP connection

```text
Frontend ---> POST /chat/stream ---> Backend
```

The connection stays open.

The server does not send the complete response immediately.

---

#### 2. StreamingResponse enables streaming

```python
return StreamingResponse(
    event_generator(),
    media_type="text/event-stream"
)
```

Instead of:

```python
return {"answer": "..."}
```

FastAPI sends data whenever the generator yields.

---

#### 3. Async Generator produces chunks

```python
async def event_generator():
    yield chunk1
    yield chunk2
    yield chunk3
```

Each `yield` becomes a network packet/chunk sent to the client.

---

#### 4. LLM streams tokens

Example:

```text
Hello
How
are
you
```

Arrives as:

```json
{"type":"token","text":"Hello "}
{"type":"token","text":"How "}
{"type":"token","text":"are "}
{"type":"token","text":"you "}
```

---

#### 5. SSE Format

Server sends:

```text
data: {"type":"token","text":"Hello "}

data: {"type":"token","text":"How "}

data: {"type":"token","text":"are "}

```

Rules:

```text
data: <payload>

```

The blank line (`\n\n`) marks the end of one event.

---

#### 6. Server pushes immediately

Every:

```python
yield f"data: {event}\n\n"
```

causes:

```text
Server ---> Browser
```

No waiting for completion.

---

#### 7. Frontend reads chunks

```text
Chunk 1 -> "Hello "
Chunk 2 -> "How "
Chunk 3 -> "are "
Chunk 4 -> "you "
```

Frontend appends them:

```ts
message += token
```

Result:

```text
Hello
Hello How
Hello How are
Hello How are you
```

---

### Request Lifecycle

```text
1. User submits prompt
            |
            v
2. Frontend calls /chat/stream
            |
            v
3. FastAPI creates StreamingResponse
            |
            v
4. stream_agent() talks to LLM
            |
            v
5. LLM generates token
            |
            v
6. event_generator() receives token
            |
            v
7. yield token
            |
            v
8. Browser receives token
            |
            v
9. React updates UI
```

---

### Normal Response vs Streaming

#### Normal API

```text
Request
   |
   v
Server works 10 sec
   |
   v
Entire response sent
```

User sees nothing for 10 seconds.

---

#### Streaming API

```text
Request
   |
   v
Token 1 ---> User sees text
Token 2 ---> User sees more text
Token 3 ---> User sees more text
Token 4 ---> User sees more text
```

User gets immediate feedback.

---

### Most Important Line In Your Code

```python
yield f"data: {sse_token}\n\n"
```

This line:

```text
LLM Token
    ↓
Generator Yield
    ↓
StreamingResponse
    ↓
HTTP Chunk
    ↓
Browser
    ↓
UI Update
```

Everything else is setup around this pipeline.


## Summary
---

1. Client sends a request to a streaming endpoint.

```text
Frontend ---> /chat/stream ---> Backend
```

2. Backend keeps the HTTP connection open instead of waiting for the entire response.

3. The LLM generates output token-by-token (or chunk-by-chunk).

```text
"Hello "
"How "
"Are "
"You"
```

4. Backend receives each token and immediately sends it to the client.

Python:

```python
yield token
```

Go:

```go
fmt.Fprintf(w, ...)
flusher.Flush()
```

5. SSE (Server-Sent Events) format is commonly used.

```text
data: Hello

data: How

data: Are

```

6. Every token/chunk travels through the same HTTP connection.

```text
LLM
 ↓
Backend
 ↓
HTTP Stream
 ↓
Browser
```

7. Frontend continuously reads incoming chunks instead of waiting for the request to finish.

8. Frontend appends new tokens to the existing message.

```text
H
He
Hel
Hello
Hello How
Hello How Are You
```

9. Streaming improves perceived latency because users see output immediately rather than waiting for the full response.

10. Core implementation difference:

* Python FastAPI: `StreamingResponse` + `yield`
* Go: `http.ResponseWriter` + `http.Flusher.Flush()`

### Mental Model

```text
Normal API:
Request
   ↓
Wait 10s
   ↓
Full Response

Streaming API:
Request
   ↓
Token 1
Token 2
Token 3
Token 4
   ↓
Complete Response
```

### Key Terms

* Server-Sent Events (SSE)
* StreamingResponse
* Async Generator
* `yield`
* `http.Flusher`
* Chunked Transfer Encoding
* Token Streaming
* Long-Lived Connection
* Incremental Rendering
* Real-Time Response Streaming
