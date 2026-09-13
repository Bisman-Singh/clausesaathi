# Accessibility

Target: WCAG 2.2 level AA. Legal information is only accessible if the tool
explaining it is, so this is a requirement of the product, not a feature.

## Checklist

| Success criterion                                 | How it is met                                                                                                                             | Where                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1.1.1 Non-text content                            | The only image is the favicon; icons are not used to carry meaning                                                                        | `app/icon.svg`                                |
| 1.3.1 Info and relationships                      | Landmarks (`header`, `nav`, `main`, `footer`), labelled regions per result section, lists, definition lists, tables never used for layout | `components/ui/section.tsx`, `app/layout.tsx` |
| 1.3.2 Meaningful sequence                         | DOM order matches reading order; results follow the form                                                                                  | `components/analyze/workspace.tsx`            |
| 1.4.1 Use of colour                               | Severity, change type and diff markers are also words or `+`/`-` text                                                                     | `risk-list.tsx`, `diff-view.tsx`              |
| 1.4.3 Contrast                                    | All token pairs meet 4.5:1 in light and dark schemes                                                                                      | `app/globals.css`                             |
| 1.4.4 Resize text / 1.4.10 Reflow                 | Relative units, flex/grid wrapping, no horizontal scroll at 320px or 200% zoom                                                            | layout classes throughout                     |
| 1.4.11 Non-text contrast                          | Form-control borders use a dedicated token at ≥3:1 on both surfaces; card borders are decorative; focus ring ≥3:1                         | `app/globals.css`                             |
| 1.4.12 Text spacing                               | No fixed heights on text containers                                                                                                       | components                                    |
| 2.1.1 Keyboard                                    | Every control is native and reachable; citation links, date inputs, checkboxes, selects                                                   | all components                                |
| 2.4.1 Bypass blocks                               | Skip link is the first tab stop                                                                                                           | `components/skip-link.tsx`                    |
| 2.4.2 Page titled                                 | Per-route titles via metadata                                                                                                             | `app/**/page.tsx`                             |
| 2.4.3 Focus order                                 | Focus moves to the results heading when an analysis arrives; clause targets are focusable                                                 | `workspace.tsx`, `clause-list.tsx`            |
| 2.4.4 Link purpose                                | Citation links carry an `aria-label` naming the clause; statute links say where they go                                                   | `clause-link.tsx`, `risk-list.tsx`            |
| 2.4.7 Focus visible                               | One global `:focus-visible` outline, never removed                                                                                        | `app/globals.css`                             |
| 2.4.11 Focus not obscured                         | `scroll-margin-top` on targets; no sticky overlays                                                                                        | `app/globals.css`                             |
| 2.5.8 Target size                                 | Buttons, inputs and selects are at least 44px tall                                                                                        | `components/ui/button.tsx`, `CONTROL_CLASS`   |
| 3.1.1 / 3.1.2 Language                            | `lang` on `html` follows the interface language; the language selector options carry their own `lang`                                     | `locale-provider.tsx`, `site-header.tsx`      |
| 3.2.2 On input                                    | Changing a select never submits; the sample picker only fills the form                                                                    | `document-form.tsx`                           |
| 3.3.1 / 3.3.3 Error identification and suggestion | Errors are text, announced with `role="alert"`, linked by `aria-describedby`, and say what to do                                          | `components/ui/field.tsx`                     |
| 3.3.2 Labels or instructions                      | Every control has a visible label and, where useful, a hint                                                                               | `components/ui/field.tsx`                     |
| 4.1.2 Name, role, value                           | Native elements only; state via `aria-invalid`, `aria-busy`, `aria-current`                                                               | components                                    |
| 4.1.3 Status messages                             | Progress and results use `role="status"`; Q&A replies stream into an `aria-live="polite"` list                                            | `components/ui/alert.tsx`, `ask-panel.tsx`    |
| Reduced motion                                    | `prefers-reduced-motion` disables animation and smooth scrolling                                                                          | `app/globals.css`                             |

## Testing

- Automated: `vitest-axe` runs on the form, results view, diff view, site
  chrome and content pages (`tests/components/`). Tests also assert labels,
  roles, `aria-current`, focus movement and live-region content.
- Manual: keyboard-only walkthrough of paste → analyse → jump to clause → enter
  anchor dates → ask a question, in both languages, in light and dark schemes.

## Known limitations

- Scans and photos are transcribed by the model and labelled as such; the
  transcription should be checked against the original.
- Statute text opens on IndiaCode, whose accessibility is outside our control.
- The Q&A answer is not read out as it streams; a short "Answer ready" status
  is announced when it completes, and the answer is then read in place.
