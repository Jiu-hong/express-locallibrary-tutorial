const { body, validationResult } = require("express-validator");
var BookInstance = require("../models/bookinstance");
var Book = require("../models/book");
var async = require("async");

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res, next) {
  BookInstance.find()
    .populate("book")
    .exec(function (err, list_bookinstances) {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render("bookinstance_list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec(function (err, bookinstance) {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        // No results.
        var err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("bookinstance_detail", {
        title: "Copy: " + bookinstance.book.title,
        bookinstance: bookinstance,
      });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res, next) {
  Book.find({}, "title").exec(function (err, books) {
    if (err) {
      return next(err);
    }
    // Successful, so render.
    res.render("bookinstance_form", {
      title: "Create BookInstance",
      book_list: books,
      status_list: ["Maintenance", "Available", "Loaned", "Reserved"],
    });
  });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitise fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    //.optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    var bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });
    console.log("due_back: ", bookinstance.due_back);

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }

        // Successful, so render.
        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
          status_list: ["Maintenance", "Available", "Loaned", "Reserved"],
        });
      });
      return;
    } else {
      // Data from form is valid.
      bookinstance.save(function (err) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  },
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec(function (err, bookinstance) {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        res.send("No bookinstance");
        return;
      } else {
        res.render("bookinstance_delete", {
          title: "Delete Bookinstance",
          instance: bookinstance,
        });
      }
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res, next) {
  BookInstance.findById(req.body.instanceid).exec(function (err, instance) {
    if (err) {
      return next(err);
    }
    if (instance == null) {
      res.redirect("/catalog/bookinstances");
      return;
    } else {
      BookInstance.findByIdAndRemove(
        req.body.instanceid,
        function deleteInstance(err) {
          if (err) {
            return next(err);
          } else {
            res.redirect("/catalog/bookinstances");
          }
        }
      );
    }
  });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function (req, res, next) {
  async.parallel(
    {
      bookinstance: function (callback) {
        BookInstance.findById(req.params.id).exec(callback);
      },
      book: function (callback) {
        Book.find().exec(callback);
      },
    },
    function (err, results) {
      if (err) {
        return next(err);
      }
      if (results.bookinstance == null) {
        res.redirect("/catalog/bookinstances");
        return;
      } else {
        res.render("bookinstance_form", {
          title: "Update Bookinstance: " + results.bookinstance._id,
          bookinstance: results.bookinstance,
          book_list: results.book,
          status_list: ["Maintenance", "Available", "Loaned", "Reserved"],
        });
      }
    }
  );
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("due_back", "Invalid date").isISO8601().toDate(),
  body("status").escape(),

  function (req, res, next) {
    const errors = validationResult(req);

    var bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id,
    });
    console.log("1 bookinstance due_back :", bookinstance.due_back);

    if (!errors.isEmpty) {
      //render again
      Book.find({}, "title").exec(function (err, books) {
        if (err) {
          return next(err);
        }
        res.render("bookinstance_form", {
          title: "Update Bookinstance: " + req.params.id,
          book_list: books,
          errors: errors.array(),
          bookinstance: bookinstance,
          status_list: ["Maintenance", "Available", "Loaned", "Reserved"],
        });
      });
      return;
    } else {
      BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (
        err,
        bookinstance
      ) {
        if (err) {
          return next(err);
        }
        console.log("2 bookinstance due_back :", bookinstance.due_back);
        res.redirect(bookinstance.url);
      });
    }
  },
];
