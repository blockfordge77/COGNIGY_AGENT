// reset-demo deletes demo-created rows from the Airtable base (RMAs and Tickets
// tables), keeping the seed records, so every demo run starts from a clean state.
//
// Usage:
//
//	export AIRTABLE_TOKEN=pat...
//	export AIRTABLE_BASE_ID=app...
//	go run . [-dry-run]
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const apiBase = "https://api.airtable.com/v0"

// Seed rows that must survive a reset.
var keep = map[string]map[string]bool{
	"RMAs":    {"RMA-2026-0041": true},
	"Tickets": {"TCK-2026-0107": true},
}

// Primary key field per table, used to match against the keep-list.
var keyField = map[string]string{
	"RMAs":    "RmaNumber",
	"Tickets": "TicketNumber",
}

type record struct {
	ID     string                 `json:"id"`
	Fields map[string]interface{} `json:"fields"`
}

type listResponse struct {
	Records []record `json:"records"`
	Offset  string   `json:"offset"`
}

func main() {
	dryRun := flag.Bool("dry-run", false, "list what would be deleted without deleting")
	flag.Parse()

	token := os.Getenv("AIRTABLE_TOKEN")
	baseID := os.Getenv("AIRTABLE_BASE_ID")
	if token == "" || baseID == "" {
		fmt.Fprintln(os.Stderr, "AIRTABLE_TOKEN and AIRTABLE_BASE_ID must be set")
		os.Exit(1)
	}

	client := &http.Client{Timeout: 15 * time.Second}

	for table, keepSet := range keep {
		records, err := listAll(client, token, baseID, table)
		if err != nil {
			fmt.Fprintf(os.Stderr, "listing %s: %v\n", table, err)
			os.Exit(1)
		}

		var doomed []string
		for _, rec := range records {
			key, _ := rec.Fields[keyField[table]].(string)
			if keepSet[key] {
				continue
			}
			doomed = append(doomed, rec.ID)
			fmt.Printf("%s: %s %s\n", table, key, map[bool]string{true: "(would delete)", false: "-> delete"}[*dryRun])
		}

		if *dryRun || len(doomed) == 0 {
			fmt.Printf("%s: %d demo rows%s\n", table, len(doomed), map[bool]string{true: " (dry run)", false: " deleted"}[*dryRun && len(doomed) > 0])
			continue
		}

		if err := deleteRecords(client, token, baseID, table, doomed); err != nil {
			fmt.Fprintf(os.Stderr, "deleting from %s: %v\n", table, err)
			os.Exit(1)
		}
		fmt.Printf("%s: %d demo rows deleted\n", table, len(doomed))
	}
}

func listAll(client *http.Client, token, baseID, table string) ([]record, error) {
	var all []record
	offset := ""
	for {
		endpoint := fmt.Sprintf("%s/%s/%s?pageSize=100", apiBase, baseID, url.PathEscape(table))
		if offset != "" {
			endpoint += "&offset=" + url.QueryEscape(offset)
		}
		req, err := http.NewRequest(http.MethodGet, endpoint, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("airtable returned %s: %s", resp.Status, body)
		}

		var page listResponse
		if err := json.Unmarshal(body, &page); err != nil {
			return nil, err
		}
		all = append(all, page.Records...)
		if page.Offset == "" {
			return all, nil
		}
		offset = page.Offset
	}
}

// deleteRecords removes records in batches of 10 (the Airtable API maximum).
func deleteRecords(client *http.Client, token, baseID, table string, ids []string) error {
	for start := 0; start < len(ids); start += 10 {
		end := start + 10
		if end > len(ids) {
			end = len(ids)
		}
		params := make([]string, 0, end-start)
		for _, id := range ids[start:end] {
			params = append(params, "records[]="+url.QueryEscape(id))
		}
		endpoint := fmt.Sprintf("%s/%s/%s?%s", apiBase, baseID, url.PathEscape(table), strings.Join(params, "&"))

		req, err := http.NewRequest(http.MethodDelete, endpoint, nil)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := client.Do(req)
		if err != nil {
			return err
		}
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return err
		}
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("airtable returned %s: %s", resp.Status, body)
		}
	}
	return nil
}
