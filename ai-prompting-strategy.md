# AI Prompting Strategy for Focus Guardian

## Overview

Focus Guardian uses Claude API to generate two types of AI-powered interactions:

1. **Periodic Relevance Checks** - Brief questions to keep users on track
2. **End-of-Session Summaries** - Reflective summaries of focus sessions

This document outlines the prompting strategies, best practices, and rationale.

---

## 1. Relevance Check Prompts

### Purpose

Generate brief, contextual questions every 15 minutes to check if the user is staying focused on their stated goal.

### Current Implementation

```javascript
const prompt = `You are a helpful focus assistant. The user is trying to stay focused on a task.

Their stated purpose: "${purpose}"
Current page: ${pageTitle} (${domain})
Time on this page: ${timeSpent} minutes
Recent pages visited: ${recentSites}

Generate ONE brief, helpful question (max 20 words) to check if they're staying on task. Be encouraging and non-judgmental. Just the question, no extra text.`;
```

### Key Principles

**1. Brevity is Critical**

- Max 20 words keeps interruptions minimal
- Users should read it in 2-3 seconds
- No preamble, just the question

**2. Non-Judgmental Tone**

- Avoid "Why are you..." or "You should..."
- Use "Is this helping..." or "Does this relate to..."
- Frame as curiosity, not accusation

**3. Context-Aware**

- Reference their specific purpose
- Mention current site if relevant
- Consider time spent

### Example Outputs

**Good Examples:**

- "Does reading about TypeScript help with your React framework research?"
- "Is browsing Twitter part of your marketing research, or a quick break?"
- "Still gathering info on Next.js, or ready to start comparing options?"

**Bad Examples:**

- ❌ "Why are you on Twitter when you said you're researching frameworks?" (judgmental)
- ❌ "According to my analysis of your browsing patterns..." (too formal, too long)
- ❌ "You've been distracted for 12 minutes now." (accusatory)

### Prompt Variations by Context

**If on social media:**

```
Purpose: ${purpose}
Current: ${domain} (${timeSpent} min)

Ask if this social browsing connects to their goal. Keep it light and friendly, max 20 words.
```

**If time spent is high (>10 min on one site):**

```
Purpose: ${purpose}
They've spent ${timeSpent} min on ${domain}

Gently check if they're getting what they need or if it's time to move on. Max 20 words, encouraging tone.
```

**If jumping between many sites:**

```
Purpose: ${purpose}
They've visited ${siteCount} sites in ${duration} min

Ask if they're finding what they need or feeling scattered. Supportive tone, max 20 words.
```

### Failure Handling

If API call fails, use a simple fallback:

```javascript
`Is browsing ${domain} helping you with: ${purpose}?`;
```

This ensures the feature still works without AI, just less personalized.

---

## 2. Session Summary Prompts

### Purpose

Generate a reflective, encouraging summary when users end their focus session.

### Current Implementation

```javascript
const prompt = `You are a helpful focus coach. Provide a brief summary of this focus session.

Original purpose: "${purpose}"
Session duration: ${sessionDuration} minutes
Sites visited with time: ${sitesVisited}

Provide a 3-sentence summary:
1. What they likely accomplished
2. Where they may have gotten distracted (if at all)
3. One encouraging tip for next time

Be positive and constructive.`;
```

### Key Principles

**1. Three-Part Structure**

- Accomplishment (celebrate progress)
- Distraction awareness (honest but kind)
- Forward-looking tip (actionable advice)

**2. Positive Framing**

- Always lead with what was accomplished
- Frame distractions as learning opportunities
- End on an encouraging note

**3. Specific and Actionable**

- Reference actual sites visited
- Mention time spent constructively
- Give concrete tips, not vague advice

### Example Outputs

**Good Summary:**

```
You spent 32 focused minutes exploring Next.js documentation and comparing it to SvelteKit - solid research work!
Twitter took about 8 minutes of your session, which might have been a quick mental break.
Next time, try setting a 25-minute timer and take a deliberate 5-minute break after to stay fresh.
```

**Another Good Example:**

```
Impressive 45-minute deep dive into React Server Components across multiple resources - you clearly found good sources!
The brief Reddit detour (6 minutes) was minimal and didn't derail your flow.
Consider bookmarking key articles as you find them so you can easily return instead of re-searching.
```

**Bad Examples:**

- ❌ Too vague: "You did some research and got a bit distracted. Try to focus more next time."
- ❌ Too negative: "You wasted 15 minutes on social media and only did 20 minutes of real work."
- ❌ Too long: [6+ sentences describing every site visited in detail]

### Prompt Variations by Session Type

**Short Session (<20 min):**

```
Purpose: ${purpose}
Duration: ${duration} min
Sites: ${sites}

This was a brief session. Give a 2-sentence summary: what they did and one quick tip. Keep it light.
```

**Highly Focused Session (few sites, long duration):**

```
Purpose: ${purpose}
Duration: ${duration} min
Sites: ${sites}

This was a very focused session! Celebrate their discipline in 3 sentences. Give an advanced tip.
```

**Distracted Session (many sites, short times):**

```
Purpose: ${purpose}
Duration: ${duration} min
Sites: ${sites}

This session had some wandering. Be extra encouraging in 3 sentences. Suggest ONE concrete strategy to help focus.
```

---

## 3. Advanced Prompting Techniques

### A. Using Few-Shot Examples

For more consistent output format, include examples in the prompt:

```javascript
const prompt = `You are a helpful focus assistant.

Example question: "Is reading about TypeScript helping with your React research?"
Example question: "Does Twitter fit into your marketing planning, or is it a break?"

Now generate a question for:
Purpose: ${purpose}
Current page: ${pageTitle}

Your question (max 20 words):`;
```

### B. Temperature and Token Settings

**For Relevance Checks:**

- `temperature: 0.7` - Slightly creative but consistent
- `max_tokens: 100` - Enough for a question + buffer
- Use `stop_sequences` if Claude tends to over-explain

**For Summaries:**

- `temperature: 0.8` - More creative, personal tone
- `max_tokens: 300` - Room for 3 good sentences
- No stop sequences needed

### C. Handling Edge Cases

**When user's purpose is vague:**

```javascript
if (purpose.length < 10) {
  // Adjust prompt to work with limited context
  `The user wants to stay focused. Ask if ${domain} is productive browsing. Max 20 words.`;
}
```

**When sites list is empty:**

```javascript
if (sites.length === 0) {
  // This is the first check
  `Ask how the focus session is starting. Encouraging, max 20 words.`;
}
```

---

## 4. Cost Optimization

### Token Usage Estimates

**Relevance Check:**

- Prompt: ~150 tokens
- Response: ~50 tokens
- **Cost: ~$0.001 per check**

**Session Summary:**

- Prompt: ~250 tokens
- Response: ~150 tokens
- **Cost: ~$0.002 per summary**

### Optimization Strategies

1. **Cache common parts** - Store model and version settings
2. **Batch if possible** - Though real-time checks need individual calls
3. **Set hard token limits** - Prevent runaway costs
4. **Rate limit checks** - Max 4-6 per hour per user

### Cost Per User Estimate

**Average 2-hour focus session:**

- 8 relevance checks: $0.008
- 1 summary: $0.002
- **Total: ~$0.01 per session**

**At scale:**

- 100 active users/day = $1/day = $30/month
- 1000 active users/day = $10/day = $300/month

**Pricing model ideas:**

- Free: 10 sessions
- Pro: $4.99/month unlimited
- BYOK: Let users add own API key

---

## 5. Future Enhancements

### More Sophisticated Context

**Add page content analysis:**

```javascript
// Get first 500 chars of page text from content script
const pageSnippet = await getPageContent();

const prompt = `Purpose: ${purpose}
Page title: ${pageTitle}
Page excerpt: "${pageSnippet}"

Is this content relevant to their purpose? Ask in max 20 words.`;
```

### Emotion and Tone Detection

**Adjust tone based on user feedback:**

```javascript
// Track if user consistently marks as "distracted"
if (recentDistractions > 3) {
  prompt += `\nNote: User is struggling to focus. Be extra supportive and offer specific help.`;
}
```

### Learning from History

**Reference past sessions:**

```javascript
const prompt = `Purpose: ${purpose}
Last session: User got distracted on ${commonDistraction}

Gently remind them to watch for that pattern. Max 20 words.`;
```

### Personalization

**Build user profile over time:**

```javascript
const profile = {
  commonDistractions: ['twitter.com', 'reddit.com'],
  bestFocusTime: 'morning',
  preferredTone: 'casual',
};

// Include in system prompt
```

---

## 6. Testing and Refinement

### A/B Test Ideas

1. **Question style:** Direct vs indirect
2. **Frequency:** 10 min vs 15 min vs 20 min
3. **Tone:** Casual vs formal vs humorous
4. **Length:** 15 words vs 20 words vs 25 words

### Key Metrics to Track

- User response rate to relevance checks
- "Yes, relevant" vs "Got distracted" ratio
- Session completion rate
- User retention after N sessions
- API cost per user

### Prompt Quality Evaluation

**Good prompts generate responses that:**

- ✓ Stay under 20 words
- ✓ Sound natural, not robotic
- ✓ Reference specific context
- ✓ Feel encouraging, not nagging
- ✓ Prompt meaningful reflection

---

## 7. Quick Reference

### Relevance Check Template

```
Purpose: [purpose]
Page: [title] ([domain])
Time: [minutes] min

One brief question (max 20 words) to check focus.
Encouraging and non-judgmental.
```

### Summary Template

```
Purpose: [purpose]
Duration: [minutes] min
Sites: [list with times]

3 sentences:
1. Accomplishment
2. Distraction (if any)
3. Tip for next time

Positive and constructive.
```

---

## Conclusion

The AI prompting strategy for Focus Guardian prioritizes:

- **Brevity** - Minimal interruption
- **Kindness** - Supportive, not judgmental
- **Context** - Relevant to actual browsing
- **Actionability** - Useful insights and tips

By keeping prompts focused and outputs constrained, we create a tool that feels like a helpful coach rather than an annoying nag.
