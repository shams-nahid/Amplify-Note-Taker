import React, { useState, useEffect } from 'react';
import { withAuthenticator } from 'aws-amplify-react';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import '@aws-amplify/ui/dist/style.css';

import { createNote, deleteNote, updateNote } from './graphql/mutations';
import {
  onCreateNote,
  onDeleteNote,
  onUpdateNote
} from './graphql/subscriptions';
import { listNotes } from './graphql/queries';

const signUpConfig = {
  header: 'Note Application',
  includeGreetings: true
};

function App() {
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState('');
  const [selectedItem, setSelectedItem] = useState({});
  const [userName, setUserName] = useState('');

  const handleChangeNote = event => setNote(event.target.value);

  const hasExistingNote = () => {
    const { id, note } = selectedItem;
    const isNote = notes.findIndex(note => note.id === id) > -1;
    return isNote ? note : false;
  };

  const handleUpdateNote = async () => {
    const input = {
      id: selectedItem.id,
      note
    };
    await API.graphql(graphqlOperation(updateNote, { input }));
    setSelectedItem({});
    setNote('');
  };

  const onSubmitNote = async event => {
    event.preventDefault();
    if (!hasExistingNote()) {
      const input = { note };
      await API.graphql(graphqlOperation(createNote, { input }));
      setNote('');
      return;
    } else {
      handleUpdateNote();
    }
  };

  const handleDeleteNote = async id => {
    const input = { id };
    await API.graphql(graphqlOperation(deleteNote, { input }));
  };

  const onSelectItem = (id, note) => {
    setSelectedItem({ id, note });
    setNote(note);
  };

  const onGetNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes));
    setNotes(result.data.listNotes.items);
  };

  const getUserName = async () => {
    const cognitoUser = await Auth.currentAuthenticatedUser();
    setUserName(cognitoUser.username);
  };

  useEffect(() => {
    onGetNotes();
    getUserName();
  }, []);

  // onCreateNote Subscription
  useEffect(() => {
    const createSubscription = API.graphql(
      graphqlOperation(onCreateNote, { owner: userName })
    ).subscribe({
      next: res => {
        const newNote = res.value.data.onCreateNote;
        const prevNotes = notes.filter(note => note.id !== newNote.id);
        setNotes([...prevNotes, newNote]);
      }
    });

    const deleteSubscription = API.graphql(
      graphqlOperation(onDeleteNote, { owner: userName })
    ).subscribe({
      next: noteData => {
        const deleteNote = noteData.value.data.onDeleteNote;
        setNotes(notes.filter(note => note.id !== deleteNote.id));
      }
    });

    const updateSubscription = API.graphql(
      graphqlOperation(onUpdateNote, { owner: userName })
    ).subscribe({
      next: noteData => {
        const updatedNote = noteData.value.data.onUpdateNote;
        const updatedNoteList = notes.map(note => {
          if (note.id === updatedNote.id) {
            return updatedNote;
          }
          return note;
        });
        setNotes(updatedNoteList);
      }
    });

    return () => {
      createSubscription.unsubscribe();
      deleteSubscription.unsubscribe();
      updateSubscription.unsubscribe();
    };
    // eslint-disable-next-line
  }, [notes]);

  return (
    <div className='flex flex-column items-center justify-center pa3 bg-washed-red'>
      <h1 className='code f2-1'>Amplify Notetaker</h1>
      <form className='mb3' onSubmit={onSubmitNote}>
        <input
          type='text'
          className='pa2 f4'
          placeholder='Write your note'
          value={note}
          onChange={handleChangeNote}
        />
        <button className='pa2 f4' type='submit'>
          {selectedItem.id ? 'Update Note' : 'Add Note'}
        </button>
      </form>
      <div>
        {notes.map(({ id, note }) => (
          <div key={id} className='flex items-center'>
            <li onClick={() => onSelectItem(id, note)} className='list pa1 f3'>
              {note}
            </li>
            <button
              className='bg-transparent bn f4'
              onClick={() => handleDeleteNote(id)}
            >
              <span>&times;</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default withAuthenticator(App, { signUpConfig });
