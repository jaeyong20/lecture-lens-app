"use client";

import React, { useState, useEffect } from "react";

export default function LectureLensPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<"하" | "중" | "상">("중");
  const [quizType, setQuizType] = useState<"multiple_choice" | "short_answer">("multiple_choice");
  
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswerInput, setShortAnswerInput] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);

  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "tutor"; text: string }>>([
    { sender: "tutor", text: "안녕하세요! 학습하시다가 이해가 잘 안 가는 수식이나 개념이 있다면 편하게 질문해 주세요." }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const loadPreset = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("isPreset", "true");
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();
      setData(json);
      resetQuizState();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetQuizState = () => {
    setShowAnswer(false);
    setSelectedOption(null);
    setShortAnswerInput("");
    setCurrentQuizIndex(0);
  };

  const handleDifficultyChange = (diff: "하" | "중" | "상") => {
    setSelectedDifficulty(diff);
    resetQuizState();
  };

  const handleTypeChange = () => {
    setQuizType((prev) => (prev === "multiple_choice" ? "short_answer" : "multiple_choice"));
    resetQuizState();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_MB = 4.5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(
        `[업로드 안내]\n선택하신 파일 크기: ${(file.size / (1024 * 1024)).toFixed(1)}MB\n\n방대한 전공 서적 전체를 올리기보다는, 시험/발제 범위인 특정 챕터(1~30페이지, 4.5MB 이하) 단위로 업로드하시면 가장 정밀한 요약과 퀴즈가 생성됩니다!`
      );
      e.target.value = "";
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok || json.error) {
        alert("PDF 분석 실패: " + (json.details || json.error || "다시 시도해 주세요."));
        return;
      }

      if (json.summary && json.quizzes) {
        setData(json);
        resetQuizState();
        setChatMessages([
          { sender: "tutor", text: `'${json.document_title || file.name}' 문서 분석이 완료되었습니다! 궁금한 점이 있으시면 언제든 질문하세요.` }
        ]);
      }
    } catch (err: any) {
      alert("문서 업로드 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || chatLoading) return;
    const userText = inputMessage;
    setInputMessage("");
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, context: data?.document_title || "전공 논문 요약" }),
      });
      const json = await res.json();
      setChatMessages((prev) => [...prev, { sender: "tutor", text: json.reply || "답변을 불러오지 못했습니다." }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: "tutor", text: "튜터 서버와 연결할 수 없습니다." }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    loadPreset();
  }, []);

  const filteredQuizzes = data?.quizzes?.filter(
    (q: any) => q.difficulty === selectedDifficulty && q.type === quizType
  ) || [];
  
  const currentQuiz = filteredQuizzes[currentQuizIndex] || filteredQuizzes[0] || data?.quizzes?.[0];

  return (
    <div className="min-h-screen bg-[#F0F5F5] text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            L
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-bold text-xl tracking-tight text-slate-900">Lecture Lens</span>
            <span className="text-xs text-teal-700 font-medium">전공 서적 · 논문 특화 AI 학업 튜터</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl border border-teal-100">
              📄
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {data?.document_title ? `[학습 중] ${data.document_title}` : "전공 서적 / 논문 PDF 업로드"}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                영어 원서나 수식이 포함된 PDF를 올리면 AI가 즉시 분석합니다. (최대 4.5MB 지원)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadPreset}
              className="bg-white border border-teal-600 text-teal-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-50 shadow-sm transition"
            >
              ⚡ Attention 논문 1초 체험
            </button>
            <label className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow cursor-pointer transition flex items-center space-x-2">
              <span>내 PDF 파일 업로드</span>
              <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* ⚠️ 상시 고정 알림 배너 */}
        <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <span className="text-base">⚠️</span>
            <span>
              <strong className="font-bold text-amber-950">[업로드 규격 안내]</strong> 원활하고 정밀한 AI 분석을 위해 <strong>4.5MB 이하의 PDF 파일만 업로드</strong>해 주세요. 두꺼운 전공 서적은 시험/세미나 범위인 <strong>챕터별(1~30페이지)</strong>로 분할하여 업로드하시는 것을 권장합니다.
            </span>
          </div>
          <span className="text-[11px] font-bold bg-amber-200/80 text-amber-950 px-2.5 py-1 rounded-lg border border-amber-300 whitespace-nowrap ml-4">
            최대 용량: 4.5MB 이하
          </span>
        </div>

        {loading && (
          <div className="my-5 p-4 bg-teal-100 text-teal-900 rounded-xl text-center font-medium animate-pulse">
            Gemini 3.6 Flash가 PDF 원본을 분석하여 3단계 요약 및 퀴즈 6문항을 생성하고 있습니다... (약 5~7초 소요)
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
          <div className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">핵심 요약 | 정답 포인트</h3>
              <span className="text-xs bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full">출처 매핑 연계</span>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[620px] pr-1">
              <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                    <span>핵심 결론</span>
                  </div>
                  <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    {data?.summary?.key_conclusions?.[0]?.location || "Pg. 1"}
                  </span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  {data?.summary?.key_conclusions?.map((item: any, idx: number) => (
                    <li key={idx} className="leading-relaxed">{item.text}</li>
                  ))}
                </ul>
              </div>

              <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                    <span>연구 방법론</span>
                  </div>
                  <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    {data?.summary?.methodology?.[0]?.location || "Pg. 2"}
                  </span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  {data?.summary?.methodology?.map((item: any, idx: number) => (
                    <li key={idx} className="leading-relaxed">{item.text}</li>
                  ))}
                </ul>
              </div>

              <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-sm text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                    <span>주요 시사점</span>
                  </div>
                  <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    {data?.summary?.key_takeaways?.[0]?.location || "Pg. 3"}
                  </span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  {data?.summary?.key_takeaways?.map((item: any, idx: number) => (
                    <li key={idx} className="leading-relaxed">{item.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h3 className="font-bold text-slate-800 text-base">문제 풀이</h3>
                
                <div className="flex items-center space-x-2">
                  <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
                    {(["하", "중", "상"] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => handleDifficultyChange(diff)}
                        className={`px-3 py-1 rounded-md transition ${
                          selectedDifficulty === diff
                            ? "bg-teal-700 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleTypeChange}
                    className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-100 transition"
                  >
                    {quizType === "multiple_choice" ? "객관식" : "주관식"}
                  </button>
                </div>
              </div>

              {currentQuiz ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                      Q.{currentQuizIndex + 1} ({currentQuiz.difficulty}급 · {currentQuiz.type === "multiple_choice" ? "객관식" : "주관식"})
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm mt-2.5 leading-relaxed">
                      {currentQuiz.question}
                    </h4>
                  </div>

                  {currentQuiz.type === "multiple_choice" && currentQuiz.options && (
                    <div className="space-y-2 mt-3">
                      {currentQuiz.options.map((opt: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedOption(opt);
                            setShowAnswer(true);
                          }}
                          className={`w-full text-left text-xs p-3 rounded-xl border transition ${
                            showAnswer
                              ? opt === currentQuiz.correct_answer
                                ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold"
                                : selectedOption === opt
                                ? "bg-rose-50 border-rose-300 text-rose-800"
                                : "border-slate-200 text-slate-600"
                              : "border-slate-200 hover:border-teal-500 hover:bg-teal-50/50"
                          }`}
                        >
                          <span className="font-bold mr-2">{idx + 1}.</span> {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQuiz.type === "short_answer" && (
                    <div className="space-y-2 mt-3">
                      <input
                        type="text"
                        value={shortAnswerInput}
                        onChange={(e) => setShortAnswerInput(e.target.value)}
                        placeholder="정답을 입력하세요 (입력 후 확인 클릭)"
                        className="w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        onKeyDown={(e) => e.key === "Enter" && setShowAnswer(true)}
                      />
                      <button
                        onClick={() => setShowAnswer(true)}
                        className="w-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-sm"
                      >
                        정답 확인
                      </button>
                    </div>
                  )}

                  {showAnswer && (
                    <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800">✅ 정답 및 해설</span>
                        <span className="text-[11px] font-semibold text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-100">
                          출제 근거: {currentQuiz.source_page}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">모범 답안: {currentQuiz.correct_answer}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{currentQuiz.explanation}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">해당 조건에 부합하는 문제가 없습니다.</div>
              )}
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setShowAnswer(false);
                  setSelectedOption(null);
                  setShortAnswerInput("");
                  setCurrentQuizIndex((prev) => (prev + 1) % (filteredQuizzes.length || 1));
                }}
                className="text-xs font-semibold text-slate-700 hover:text-teal-700 flex items-center space-x-1"
              >
                <span>다른 문제 풀기 ➔</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between h-[680px]">
            <div>
              <div className="border-b pb-3 mb-3">
                <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                  <span>🎓 AI 튜터</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">난이도 조절형 실시간 질의응답</p>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[490px] pr-1">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-slate-400 mb-0.5 font-medium">
                      {msg.sender === "user" ? "User" : "AI Tutor"}
                    </span>
                    <div
                      className={`text-xs p-3 rounded-2xl max-w-[90%] leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-teal-700 text-white rounded-tr-none shadow-sm"
                          : "bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="text-xs text-teal-600 animate-pulse font-medium">튜터가 답변을 작성하고 있습니다...</div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t flex items-center space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="무엇이든 물어보세요..."
                className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
              <button
                onClick={handleSendMessage}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold transition shadow-sm"
              >
                전송
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
