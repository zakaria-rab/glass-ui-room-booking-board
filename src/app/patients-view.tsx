"use client";

import { type ReactNode, useState } from "react";

import { ADD_PATIENT, CHANGE_PATIENT, REMOVE_PATIENT } from "@/graphql/queries";
import { gql } from "@/lib/graphql-client";
import { type Patient, VISIT_STATUSES } from "@/lib/types";

import styles from "./page.module.css";

/** Sentence case for the UI; the wire format stays the schema's enum. */
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  CHECKED_IN: "Checked in",
  COMPLETED: "Completed",
  NO_SHOW: "No show",
};

const blank = { name: "", phone: "", provider: "", nextVisit: "", balance: "0" };

export function PatientsView({
  initialPatients,
  footer,
}: {
  initialPatients: Patient[];
  /** Server-rendered, so it can read VERCEL_* without shipping them here. */
  footer?: ReactNode;
}) {
  const [patients, setPatients] = useState(initialPatients);
  const [draft, setDraft] = useState(blank);
  const [error, setError] = useState("");

  /**
   * Every mutation returns the row it touched, so the list is updated from the
   * response instead of refetched. One round trip per change, and no window
   * where the table disagrees with the server.
   */
  async function send<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
    try {
      const data = await gql<T>(query, variables);
      setError("");
      return data;
    } catch (cause) {
      setError((cause as Error).message);
      return null;
    }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const data = await send<{ addPatient: Patient }>(ADD_PATIENT, {
      input: { ...draft, balance: Number(draft.balance) },
    });
    if (!data) return;
    setPatients((current) => [...current, data.addPatient]);
    setDraft(blank);
  }

  async function change(id: string, changes: Record<string, unknown>) {
    const data = await send<{ changePatient: Patient }>(CHANGE_PATIENT, { id, changes });
    if (!data) return;
    setPatients((current) =>
      current.map((patient) => (patient.id === id ? data.changePatient : patient)),
    );
  }

  async function remove(id: string) {
    const data = await send<{ removePatient: string }>(REMOVE_PATIENT, { id });
    if (!data) return;
    setPatients((current) => current.filter((patient) => patient.id !== data.removePatient));
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <strong>Glass PMS</strong>
        <span className={styles.count}>{patients.length} patients</span>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2>Add patient</h2>
          <form className={styles.form} onSubmit={add}>
            <input
              placeholder="Full name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <input
              placeholder="Phone"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            <input
              placeholder="Provider"
              value={draft.provider}
              onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
            />
            <input
              type="date"
              aria-label="Next visit"
              value={draft.nextVisit}
              onChange={(e) => setDraft({ ...draft, nextVisit: e.target.value })}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              aria-label="Balance"
              value={draft.balance}
              onChange={(e) => setDraft({ ...draft, balance: e.target.value })}
            />
            <button className={styles.primary}>Save patient</button>
          </form>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </section>

        <section className={styles.card}>
          <h2>Schedule</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Provider</th>
                <th>Next visit</th>
                <th>Status</th>
                <th className={styles.num}>Balance</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.name}</td>
                  <td>{patient.phone}</td>
                  <td>{patient.provider}</td>
                  <td>
                    <input
                      type="date"
                      aria-label={`Next visit for ${patient.name}`}
                      value={patient.nextVisit}
                      onChange={(e) => change(patient.id, { nextVisit: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Status for ${patient.name}`}
                      value={patient.status}
                      onChange={(e) => change(patient.id, { status: e.target.value })}
                    >
                      {VISIT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={styles.num}>${patient.balance.toFixed(2)}</td>
                  <td>
                    <button className={styles.ghost} onClick={() => remove(patient.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {footer}
      </main>
    </div>
  );
}
