# EduSite (mini sito educativo)

Un template statico (HTML/CSS/JS) con:
- Lezioni caricate da `data/lessons.json`
- Quiz caricati da `data/quizzes.json`
- Ricerca rapida
- Accessibile e responsive

## Avvio in locale
Puoi aprire `index.html` direttamente, ma per il fetch dei JSON alcuni browser richiedono un server locale.

Opzione semplice (Python):
```bash
python -m http.server 8000
```
Poi apri: http://localhost:8000

## Deploy (gratis)
- GitHub Pages
- Netlify / Vercel
- Qualsiasi hosting statico

## Aggiungere una lezione
Apri `data/lessons.json` e aggiungi un oggetto come gli altri (id unico).

## Aggiungere un quiz
Apri `data/quizzes.json` e aggiungi un quiz con `lessonId` che punta alla lezione.
