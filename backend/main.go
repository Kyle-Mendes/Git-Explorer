package main

import (
	"encoding/json"
	"fmt"
	"github.com/libgit2/git2go"
	"net/http"
	"os"
	"path"
	"strings"
)

var repo *git.Repository
var head *git.Reference

var treeWalk git.TreeWalkCallback

type Payload struct {
	Tree     map[string]Commit `json:"commits"`
	Branches []string          `json:"branches"`
}

func handler(w http.ResponseWriter, r *http.Request) {
	tree := make(map[string]Commit)
	branches := getBranches(tree)

	payload := Payload{tree, branches}

	p, _ := json.Marshal(payload)
	w.Write(p)
}

func repoHandler(w http.ResponseWriter, r *http.Request) {
	var err error

	url := strings.Split(r.RequestURI, "=")[1]
	url = strings.Split(url, "?")[0] // removing any extra url parameters
	escape := strings.Replace(url, "/", "_", -1)

	repo, err = git.Clone("http://"+url, "./tmp/"+escape, &git.CloneOptions{})

	if err != nil {
		if len(err.Error()) > 0 {
			fmt.Fprintln(os.Stderr, err.Error())
		}
		os.RemoveAll("./tmp/" + escape)
		// os.Exit(1)
	}

	tree := make(map[string]Commit)
	branches := getBranches(tree)

	payload := Payload{tree, branches}

	p, _ := json.Marshal(payload)
	w.Write(p)
	os.RemoveAll("./tmp/" + escape)
}

func startServer() {
	// http.HandleFunc("/", handler)
	http.HandleFunc("/", repoHandler)
	http.ListenAndServe(":8080", nil)
}

func walker(dirname string, entry *git.TreeEntry) int {
	fmt.Printf("Walking: %s", path.Join(dirname, entry.Name))
	return 0
}

func getBranches(tree map[string]Commit) []string {
	it, _ := repo.NewBranchIterator(git.BranchRemote)

	var branches []string

	for {
		branch, _, err := it.Next()

		if err != nil {
			if len(err.Error()) > 0 {
				fmt.Fprintln(os.Stderr, err.Error())
			}
			it.Free()
			break
		}

		oid := branch.Target()
		name, _ := branch.Name()

		getCommits(oid, branch, tree)

		branches = append(branches, name)
	}

	return branches
}

func getCommits(oid *git.Oid, branch *git.Branch, tree map[string]Commit) {
	rev, _ := repo.Walk()

	rev.Sorting(git.SortTime)
	rev.Push(oid)

	name, _ := branch.Name()

	for {
		err := rev.Next(oid)
		if err != nil {
			if len(err.Error()) > 0 {
				fmt.Fprintln(os.Stderr, err.Error())
			}
			rev.Free()
			break
		}

		comm, _ := repo.LookupCommit(oid)

		_, ok := tree[comm.Id().String()]

		if !ok { // If the commit ISN'T in the tree...
			var id string
			if comm.ParentCount() > 0 {
				id = comm.ParentId(0).String()
			} else {
				id = ""
			}

			c := Commit{
				Id:      comm.Id().String(),
				Author:  comm.Author().Name,
				Date:    comm.Author().When.String(),
				Message: comm.Message(),
				Parent:  id,
				Branch:  name,
			}

			tree[c.Id] = c
		} else {
			head, _ := branch.IsHead()
			if head {
				c := tree[comm.Id().String()]

				c.Branch = name

				tree[c.Id] = c
			}
		}
	}
}

func main() {
	// var err error

	// repo, err = git.Clone(args[0], "./tmp", &git.CloneOptions{})

	// 	if err != nil {
	// 		if len(err.Error()) > 0 {
	// 			fmt.Fprintln(os.Stderr, err.Error())
	// 		}
	// 		os.Exit(1)
	// 	}

	startServer()
}

type Commit struct {
	Id      string `json:"id"`
	Author  string `json:"author"`
	Date    string `json:"createdAt"`
	Message string `json:"message"`
	Parent  string `json:"parentId"` // The Parent's OID
	Branch  string `json:"branch"`
	IsHead  bool   `json:"isHead"`
}

type Branch struct {
	Name    string   `json:"name"`
	Commits []Commit `json:"commits"`
}
