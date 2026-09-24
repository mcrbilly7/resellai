# Nossonk LLC

Professional door hanger distribution website for the Dallas–Fort Worth Metroplex.

**Rate:** $0.25 per door  
**Travel:** $15 for cities outside Dallas  
**Travel waived:** 1,000+ doors  
**Legal name:** Nossonk LLC  
**Coverage:** DFW Metroplex only  

## Contact

- Call or text: [(945) 239-5974](tel:+19452395974)
- Email: [noskotx@gmail.com](mailto:noskotx@gmail.com)

## Local preview

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## GitHub Pages

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` / root
4. Site will publish at `https://<your-username>.github.io/<repo-name>/`

## Pricing logic

```
total = doors × 0.25
if city is Dallas: travel = 0
else if doors >= 1000: travel = 0
else: travel = 15
```

Cities outside the DFW list are marked as not currently served.
