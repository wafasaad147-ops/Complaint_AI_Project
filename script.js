
let modelData = null;

// تحميل نموذج الذكاء الاصطناعي
async function loadModel() {
    try {
        const response = await fetch("complaint_model_web.json");
        modelData = await response.json();
        console.log("تم تحميل نموذج الذكاء الاصطناعي بنجاح ✅");
    } catch (error) {
        console.error("حدث خطأ أثناء تحميل النموذج:", error);
    }
}


// تنظيف النص بنفس الفكرة المستخدمة في Python
function cleanText(text) {
    return text
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\d+/gu, " ")
        .replace(/\s+/gu, " ")
        .trim();
}


// إنشاء Character N-Grams
function generateNgrams(text, minN, maxN) {
    const ngrams = [];

    for (let n = minN; n <= maxN; n++) {
        for (let i = 0; i <= text.length - n; i++) {
            ngrams.push(text.substring(i, i + n));
        }
    }

    return ngrams;
}


// تحويل النص إلى TF-IDF
function textToTfidf(text) {

    const cleaned = cleanText(text);

    const ngrams = generateNgrams(
        cleaned,
        modelData.ngram_range[0],
        modelData.ngram_range[1]
    );

    const vector = new Array(modelData.idf.length).fill(0);

    const counts = {};

    ngrams.forEach(ngram => {
        counts[ngram] = (counts[ngram] || 0) + 1;
    });

    for (const ngram in counts) {

        const index = modelData.vocabulary[ngram];

        if (index !== undefined) {
            vector[index] = counts[ngram] * modelData.idf[index];
        }
    }

    // L2 Normalization
    let norm = 0;

    for (let i = 0; i < vector.length; i++) {
        norm += vector[i] * vector[i];
    }

    norm = Math.sqrt(norm);

    if (norm > 0) {
        for (let i = 0; i < vector.length; i++) {
            vector[i] /= norm;
        }
    }

    return vector;
}


// التنبؤ بالتصنيف
function predictCategory(vector) {

    const scores = [];

    for (let c = 0; c < modelData.classes.length; c++) {

        let score = modelData.intercept[c];

        for (let i = 0; i < vector.length; i++) {
            score += modelData.coef[c][i] * vector[i];
        }

        scores.push(score);
    }

    let bestIndex = 0;

    for (let i = 1; i < scores.length; i++) {
        if (scores[i] > scores[bestIndex]) {
            bestIndex = i;
        }
    }

    return modelData.classes[bestIndex];
}


// تحليل المشاعر
function analyzeSentiment(text) {

    const cleaned = cleanText(text);

    const positiveWords = [
        "ممتاز",
        "ممتازة",
        "رائع",
        "رائعة",
        "سهل",
        "سهلة",
        "سريع",
        "سريعة",
        "متعاون",
        "متعاونون",
        "جيد",
        "جيدة"
    ];

    const negativeWords = [
        "سيء",
        "سيئة",
        "مشكلة",
        "صعوبة",
        "بطيء",
        "بطيئة",
        "انتظار",
        "انتظرت",
        "طويل",
        "طويلة",
        "ساعة",
        "لا يعمل",
        "لا تعمل",
        "لا توجد",
        "اضطررت",
        "لم يتعامل"
    ];

    if (negativeWords.some(word => cleaned.includes(word))) {
        return "سلبي";
    }

    if (positiveWords.some(word => cleaned.includes(word))) {
        return "إيجابي";
    }

    return "محايد";
}


// إنشاء الرد المقترح
function generateResponse(category) {

    const responses = {

        "تقنية":
            "نعتذر عن المشكلة التقنية. نوصي بإعادة المحاولة، وإذا استمرت المشكلة يرجى التواصل مع الدعم الفني.",

        "الانتظار":
            "نعتذر عن طول فترة الانتظار، ونعمل على تحسين سرعة تقديم الخدمة.",

        "خدمة العملاء":
            "نعتذر عن التجربة، ونأخذ ملاحظتك بعين الاعتبار لتحسين جودة خدمة العملاء.",

        "مرافق":
            "شكرًا على ملاحظتك، وسيتم أخذ اقتراح تحسين المرافق في الاعتبار.",

        "خدمات إلكترونية":
            "شكرًا على اقتراحك، وسنعمل على تطوير الخدمات الإلكترونية لتسهيل تجربة المستخدم.",

        "دفع":
            "نعتذر عن مشكلة الدفع، ونوصي بإعادة المحاولة أو التواصل مع الدعم المختص.",

        "إجراءات":
            "شكرًا على ملاحظتك، وسنعمل على توضيح الإجراءات المطلوبة للمستفيدين.",

        "ساعات العمل":
            "شكرًا على اقتراحك، وسيتم أخذ ملاحظة تمديد ساعات العمل بعين الاعتبار.",

        "السرعة":
            "شكرًا على ملاحظتك الإيجابية، ويسعدنا أن سرعة الخدمة كانت مرضية."
    };

    return responses[category] ||
        "شكرًا لتواصلك معنا. تم تسجيل ملاحظتك وسيتم التعامل معها.";
}


// تشغيل التحليل عند الضغط على الزر
document
    .getElementById("analyzeButton")
    .addEventListener("click", function () {

        const complaint =
            document.getElementById("complaintInput").value.trim();

        if (!complaint) {
            alert("يرجى كتابة الشكوى أولًا.");
            return;
        }

        if (!modelData) {
            alert("النموذج لم يتم تحميله بعد. يرجى الانتظار قليلًا.");
            return;
        }

        const vector = textToTfidf(complaint);

        const category = predictCategory(vector);

        const sentiment = analyzeSentiment(complaint);

        const response = generateResponse(category);

        document.getElementById("category").textContent = category;
        document.getElementById("sentiment").textContent = sentiment;
        document.getElementById("response").textContent = response;

        document
            .getElementById("result")
            .classList.remove("hidden");
    });


// تحميل النموذج عند فتح الصفحة
loadModel();
