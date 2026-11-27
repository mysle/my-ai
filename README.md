# My AI Chat

Aplikacja czatu AI działająca w przeglądarce (WebGPU) z wybranym modelem LLM, hostowana na GitHub Pages.

## Cechy
- Działa całkowicie w przeglądarce - brak backendu, brak limitów
- Model pobierany i cache'owany lokalnie (WebLLM / MLC)
- Wybór modelu: Llama 3.2 3B lub Mistral 7B
- Odpowiada po polsku, bez cenzury

## Wymagania
- Nowoczesna przeglądarka z obsługą WebGPU (Chrome/Edge 113+)
- GPU z wystarczającą ilością VRAM (min. ~4GB dla Llama 3.2 3B)

## Deploy na GitHub Pages
1. Stwórz repozytorium `my-ai` na GitHubie.
2. Wgraj pliki z tego folderu.
3. W ustawieniach repo: Settings -> Pages -> Source: GitHub Actions.
4. Workflow `.github/workflows/pages.yml` automatycznie wdroży stronę.

## Lokalne uruchomienie
Otwórz `index.html` przez lokalny serwer (np. `python3 -m http.server`), ponieważ moduły ES wymagają serwera HTTP.

## Uwaga o "braku cenzury"
Domyślne modele Instruct mają wbudowane zabezpieczenia. Aby uzyskać w pełni nieocenzurowany model, podmień `modelSelect` na nieocenzurowany model w formacie MLC (np. z HuggingFace) i dodaj jego konfigurację do WebLLM.