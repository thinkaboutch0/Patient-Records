import { ageFrom, longDate, today } from '../utils.js'

export default function CertificatePrint({ patient: p, cert: c, doctor: d }) {
  const age = p.bday ? ageFrom(p.bday) : p.age
  return (
    <div id="print">
      <div className="cp-head">
        <div>
          <div className="cp-doc">{d.name || 'Physician name, MD'}</div>
          <div className="cp-sub">{d.specialty}</div>
        </div>
        <div className="cp-brand">{d.clinic}</div>
      </div>

      <div className="cp-meta">
        <div>
          <div>Name: {p.name}</div>
          <div>Address: {p.address}</div>
        </div>
        <div className="r">
          <div>Date: {longDate(today())}</div>
          <div>Age: {age ? `${age} years` : ''}</div>
        </div>
      </div>

      <div className="cp-title">Medical Certificate</div>
      <p>To whom it may concern:</p>
      <p>
        This is to certify that <b>{p.name}</b>
        {age ? <>, <b>{age} years</b> of age</> : null}
        {p.sex ? <>, {p.sex}</> : null}, consulted on <b>{longDate(c.date)}</b> with the following clinical impression:
      </p>
      {c.impression && <p className="cp-imp">{c.impression}</p>}
      {c.days && <p>And would need medical attention for {c.days} day(s) barring complications.</p>}
      {c.recs && <p className="pre">{c.recs}</p>}
      {c.disclaimer && <p>{c.disclaimer}</p>}

      <div className="cp-foot">
        <div className="cp-clinic"><b>{d.clinic}</b><br />{d.clinicInfo}</div>
        <div className="cp-sign">
          <div className="cp-line" />
          <b>{d.name}</b><br />
          License No. {d.license}<br />
          PTR # {d.ptr}<br />
          PHIC No. {d.phic}
        </div>
      </div>
    </div>
  )
}
