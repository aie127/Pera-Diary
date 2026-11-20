function totalFor(items, type) {
  return items.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0);
}

function advisorReply(question, transactions, today = new Date(), currencyCode = "USD") {
  const advisorCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode });
  const prompt = question.toLowerCase();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");
  const monthPrefix = todayString.slice(0, 7);
  const thisMonth = transactions.filter((item) => item.date.startsWith(monthPrefix) && item.date <= todayString);
  const expenses = thisMonth.filter((item) => item.type === "expense");
  const income = totalFor(thisMonth, "income");
  const spending = totalFor(thisMonth, "expense");
  const categoryTotals = new Map();
  expenses.forEach((item) => {
    categoryTotals.set(item.category, (categoryTotals.get(item.category) || 0) + item.amount);
  });
  const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  const monthName = today.toLocaleDateString("en-US", { month: "long" });

  if (/\b(invest|stock|stocks|share|shares|crypto|cryptocurrency|tax|loan|mortgage|retirement)\b/.test(prompt)) {
    return "I can help with everyday budgeting and cash-flow patterns, but I can’t recommend investments or provide tax, credit, or legal advice. For decisions like those, speak with a qualified financial professional.";
  }
  if (thisMonth.length === 0) {
    return `I don’t see any transactions for ${monthName} yet. Add a few income and expense entries, and I can summarize your spending patterns.`;
  }
  if (/\b(save|saving|spend less|cut back|reduce)\b/.test(prompt)) {
    if (!topCategory) return `You have ${advisorCurrency.format(income)} in income logged for ${monthName} and no expenses yet. Keep recording spending to spot areas you might want to review.`;
    return `Your largest recorded expense category this month is ${topCategory[0]} at ${advisorCurrency.format(topCategory[1])} (${Math.round(topCategory[1] / spending * 100)}% of logged spending). If you want to save, review upcoming optional purchases in that category and choose a limit that fits your needs.`;
  }
  if (/\b(where|most|category|categories)\b/.test(prompt)) {
    return topCategory
      ? `${topCategory[0]} is your largest expense category for ${monthName}, at ${advisorCurrency.format(topCategory[1])}. You’ve logged ${advisorCurrency.format(spending)} in expenses across ${expenses.length} transactions.`
      : `No expenses are logged for ${monthName} yet. Once you add some, I can show which categories account for the most spending.`;
  }
  if (/\b(income|cash flow|cashflow|left over|balance)\b/.test(prompt)) {
    const net = income - spending;
    return `For ${monthName}, you’ve logged ${advisorCurrency.format(income)} in income and ${advisorCurrency.format(spending)} in expenses, leaving a recorded net of ${advisorCurrency.format(net)}. This only reflects entries in Pera Diary; it may not include every bill or obligation.`;
  }
  const categoryNote = topCategory
    ? ` Your largest expense category is ${topCategory[0]} (${advisorCurrency.format(topCategory[1])}).`
    : "";
  const net = income - spending;
  return `So far in ${monthName}, you’ve logged ${advisorCurrency.format(income)} in income and ${advisorCurrency.format(spending)} in expenses across ${thisMonth.length} transactions.${categoryNote} Your recorded net is ${advisorCurrency.format(net)}; check that regular bills and other obligations are included for a fuller picture.`;
}

globalThis.advisorReply = advisorReply;
