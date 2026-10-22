// Volleyball match format on the scoreboard page: a ready-made template, or own values.
import { useState } from 'react';
import { useI18n } from '../i18n.jsx';
import { Button, Card } from '../ui.jsx';

export const FORMAT_TEMPLATES = {
    indoor5: { bestOf: 5, pointsPerSet: 25, decidingSetPoints: 15, maxTimeouts: 2 },
    indoor3: { bestOf: 3, pointsPerSet: 25, decidingSetPoints: 15, maxTimeouts: 2 },
    beach: { bestOf: 3, pointsPerSet: 21, decidingSetPoints: 15, maxTimeouts: 1 },
};

const FIELDS = ['bestOf', 'pointsPerSet', 'decidingSetPoints', 'maxTimeouts'];

const templateOf = (format) =>
    Object.keys(FORMAT_TEMPLATES).find((id) => FIELDS.every((f) => FORMAT_TEMPLATES[id][f] === format[f])) || 'custom';

const selectClass = 'w-full bg-[#15171d] border border-[#323844] rounded p-2.5 text-white';

export default function MatchFormat({ format, busy, onSave }) {
    const { t } = useI18n();
    const [form, setForm] = useState(format);
    const [template, setTemplate] = useState(templateOf(format));

    const pick = (id) => {
        setTemplate(id);
        if (FORMAT_TEMPLATES[id]) setForm(FORMAT_TEMPLATES[id]);
    };
    const setNumber = (field) => (e) => {
        const next = { ...form, [field]: Number(e.target.value) };
        setForm(next);
        setTemplate(templateOf(next));
    };
    const number = (field, min, max) => (
        <label className="block">
            <span className="block text-sm font-semibold text-gray-400 mb-1.5">{t(`format.${field}`)}</span>
            <input type="number" required min={min} max={max} value={form[field]} onChange={setNumber(field)} className={selectClass} />
        </label>
    );
    const save = (e) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <Card title={t('format.title')}>
            <p className="text-sm text-gray-400">{t('format.help')}</p>
            <form onSubmit={save} className="space-y-4">
                <label className="block">
                    <span className="block text-sm font-semibold text-gray-400 mb-1.5">{t('format.template')}</span>
                    <select value={template} onChange={(e) => pick(e.target.value)} className={selectClass}>
                        {Object.keys(FORMAT_TEMPLATES).map((id) => <option key={id} value={id}>{t(`format.${id}`)}</option>)}
                        <option value="custom">{t('format.custom')}</option>
                    </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="block text-sm font-semibold text-gray-400 mb-1.5">{t('format.bestOf')}</span>
                        <select value={form.bestOf} onChange={setNumber('bestOf')} className={selectClass}>
                            {[1, 3, 5, 7].map((n) => <option key={n} value={n}>{t('format.bestOfN', { n })}</option>)}
                        </select>
                    </label>
                    {number('pointsPerSet', 5, 99)}
                    {number('decidingSetPoints', 5, 99)}
                    {number('maxTimeouts', 0, 5)}
                </div>
                <Button type="submit" disabled={busy}>{t('format.save')}</Button>
            </form>
        </Card>
    );
}
